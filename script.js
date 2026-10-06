// ===================================================
// 바이브 카페 주문서 자바스크립트 (script.js)
// ===================================================

// ---------------------------------------------------
// 0. Supabase 접속 정보 설정 (본인의 정보를 직접 입력해주세요)
//    - Supabase 대시보드 -> Project Settings -> API에서 확인 가능합니다.
// ---------------------------------------------------
const SUPABASE_URL = 'https://kwmpckdccrbwiqkwmook.supabase.co'; // 예: 'https://abcdefghijklmn.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3bXBja2RjY3Jid2lxa3dtb29rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2MzAwMTYsImV4cCI6MjEwNjIwNjAxNn0.P6QR-UAt2zP1cMAFUQzjC4H-BKWfDCGHK3sCuhJublM'; // 예: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'

// Supabase 클라이언트 생성 (요청하신 supabaseClient 변수명)
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// HTML 문서가 준비되면 실행
document.addEventListener('DOMContentLoaded', function () {
  // ---------------------------------------------------
  // 1. 필요한 HTML 요소들을 id로 찾아오기
  // ---------------------------------------------------
  const orderForm = document.getElementById('order-form');               // 주문 폼
  const customerNameInput = document.getElementById('customer-name');   // 이름 입력창
  const customerPhoneInput = document.getElementById('customer-phone'); // 전화번호 입력창
  const beverageSelect = document.getElementById('beverage-select');     // 음료 선택 드롭다운
  const quantityInput = document.getElementById('quantity');             // 수량 입력창
  const requestsInput = document.getElementById('requests');             // 요청사항 입력창
  const totalPriceSpan = document.getElementById('total-price');         // 예상 금액 숫자 표시 영역
  const submitBtn = document.getElementById('submit-btn');               // 주문하기 버튼
  const resetBtn = document.getElementById('reset-btn');                 // 다시 작성 버튼
  const orderConfirmation = document.getElementById('order-confirmation'); // 주문 확인 메시지 영역

  // ---------------------------------------------------
  // 2. 총 주문 금액 계산 함수 (calculateTotal)
  //    - 음료, 사이즈, 옵션의 data-price 값과 수량을 계산
  // ---------------------------------------------------
  function calculateTotal() {
    // 음료를 선택하지 않았으면 0원 반환
    if (!beverageSelect.value) {
      return 0;
    }

    // 선택된 음료 기본 가격
    const selectedOption = beverageSelect.options[beverageSelect.selectedIndex];
    const beveragePrice = parseInt(selectedOption.dataset.price || '0', 10);

    // 선택된 사이즈 추가 금액
    const selectedSizeRadio = document.querySelector('input[name="size"]:checked');
    const sizePrice = selectedSizeRadio ? parseInt(selectedSizeRadio.dataset.price || '0', 10) : 0;

    // 선택된 추가 옵션 금액 합산
    const checkedOptions = document.querySelectorAll('input[name="option"]:checked');
    let optionsPrice = 0;
    checkedOptions.forEach(function (checkbox) {
      optionsPrice += parseInt(checkbox.dataset.price || '0', 10);
    });

    // 수량 확인 (기본값 1)
    let quantity = parseInt(quantityInput.value, 10);
    if (isNaN(quantity) || quantity < 1) {
      quantity = 1;
    }

    // (기본음료값 + 사이즈추가금 + 옵션추가금) * 수량
    const singlePrice = beveragePrice + sizePrice + optionsPrice;
    return singlePrice * quantity;
  }

  // ---------------------------------------------------
  // 3. 화면의 예상 금액을 갱신하는 함수
  // ---------------------------------------------------
  function updatePriceDisplay() {
    const total = calculateTotal();
    // 숫자에 천 단위 콤마(toLocaleString) 붙여서 출력 (예: 5,000)
    totalPriceSpan.textContent = total.toLocaleString();
  }

  // ---------------------------------------------------
  // 4. 입력값이 바뀔 때마다 실시간으로 금액 계산
  // ---------------------------------------------------
  // 음료 변경 시
  beverageSelect.addEventListener('change', updatePriceDisplay);

  // 사이즈 라디오 변경 시
  const sizeRadios = document.querySelectorAll('input[name="size"]');
  sizeRadios.forEach(function (radio) {
    radio.addEventListener('change', updatePriceDisplay);
  });

  // 추가옵션 체크박스 변경 시
  const optionCheckboxes = document.querySelectorAll('input[name="option"]');
  optionCheckboxes.forEach(function (checkbox) {
    checkbox.addEventListener('change', updatePriceDisplay);
  });

  // 수량 변경 시
  quantityInput.addEventListener('input', updatePriceDisplay);
  quantityInput.addEventListener('change', updatePriceDisplay);

  // ---------------------------------------------------
  // 5. 주문하기 버튼 클릭 시 Supabase에 저장 및 결과 표시
  //    (비동기 처리를 위해 async 키워드 사용)
  // ---------------------------------------------------
  orderForm.addEventListener('submit', async function (event) {
    event.preventDefault(); // 기본 새로고침 동작 방지

    // (1) 입력값 유효성 검사 (이름 확인)
    const customerName = customerNameInput.value.trim();
    if (!customerName) {
      alert('이름을 입력해주세요');
      customerNameInput.focus();
      return;
    }

    // (2) 입력값 유효성 검사 (음료 선택 확인)
    if (!beverageSelect.value) {
      alert('음료를 선택해주세요');
      beverageSelect.focus();
      return;
    }

    // (3) 저장에 필요한 데이터 정리
    const customerPhone = customerPhoneInput.value.trim(); // 전화번호
    const selectedBeverageOption = beverageSelect.options[beverageSelect.selectedIndex];
    const beverageName = selectedBeverageOption.text.replace(/\s*\(.*\)/, '').trim(); // 음료명 (예: '카페라떼')
    const beveragePrice = parseInt(selectedBeverageOption.dataset.price || '0', 10);   // 음료 기본 가격 (예: 4000)

    // 선택된 사이즈
    const selectedSizeRadio = document.querySelector('input[name="size"]:checked');
    const sizeValue = selectedSizeRadio ? selectedSizeRadio.value : 'M'; // 'S', 'M', 'L'

    // 선택된 추가 옵션 배열 만들기 (예: ['샷 추가', '크림 추가'])
    const checkedOptions = document.querySelectorAll('input[name="option"]:checked');
    const selectedOptionNames = Array.from(checkedOptions).map(function (cb) {
      const label = document.querySelector(`label[for="${cb.id}"]`);
      return label ? label.textContent.replace(/\s*\(.*\)/, '').trim() : cb.value;
    });

    const quantity = parseInt(quantityInput.value, 10) || 1; // 수량
    const customerRequest = requestsInput.value.trim();       // 요청사항
    const total = calculateTotal();                          // 총 금액

    // (4) 중복 클릭 방지: 저장하는 동안 주문하기 버튼 비활성화
    submitBtn.disabled = true;
    const originalBtnText = submitBtn.textContent;
    submitBtn.textContent = '주문 저장 중...';

    try {
      // (5) Supabase orders 테이블에 데이터 저장 (INSERT)
      // Supabase 테이블의 실제 열 이름과 100% 일치시킵니다:
      // customer_name, customer_phone, beverage, size, options, quantity, requests, total_price
      const { data, error } = await supabaseClient
        .from('orders')
        .insert([
          {
            customer_name: customerName,
            customer_phone: customerPhone,
            beverage: beverageName,
            size: sizeValue,
            options: selectedOptionNames, // 배열 형태
            quantity: quantity,
            requests: customerRequest,
            total_price: total
          }
        ]);

      // Supabase에서 에러를 반환했을 경우 에러 발생시키기
      if (error) {
        throw error;
      }

      // (6) 저장 성공 시 주문 확인 메시지 조립 및 표시
      const optionText = selectedOptionNames.length > 0 ? ` (${selectedOptionNames.join(', ')})` : '';
      const confirmationMessage = `${customerName}님, ${beverageName} ${sizeValue}사이즈${optionText} ${quantity}잔, 총 ${total.toLocaleString()}원 주문이 접수되었습니다!`;

      orderConfirmation.textContent = confirmationMessage;
      orderConfirmation.hidden = false;
      orderConfirmation.classList.remove('hidden');

      // 메시지 영역으로 부드럽게 스크롤
      orderConfirmation.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    } catch (err) {
      // (7) 저장 실패 시 알림창 띄우고 콘솔에 에러 출력
      alert('주문 저장에 실패했어요');
      console.error('주문 저장 에러:', err);
    } finally {
      // (8) 작업 완료 후(성공/실패 모두) 주문하기 버튼 다시 활성화
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
    }
  });

  // ---------------------------------------------------
  // 6. 다시 작성 버튼 클릭 시 초기화
  // ---------------------------------------------------
  resetBtn.addEventListener('click', function () {
    setTimeout(function () {
      // M 사이즈 기본 선택
      const sizeMRadio = document.getElementById('size-m');
      if (sizeMRadio) {
        sizeMRadio.checked = true;
      }

      // 수량 1 및 금액 0원 리셋
      quantityInput.value = 1;
      updatePriceDisplay();

      // 주문 확인 메시지 숨김
      orderConfirmation.textContent = '';
      orderConfirmation.hidden = true;
      orderConfirmation.classList.add('hidden');

      // 이름 입력칸으로 포커스
      customerNameInput.focus();
    }, 0);
  });

  // 처음 접속 시 예상 금액(0원) 표시
  updatePriceDisplay();
});
