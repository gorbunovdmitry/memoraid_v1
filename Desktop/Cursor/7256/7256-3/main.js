const app = document.getElementById('app');

function sendAnalyticsEvent(gaEvent, ymEvent) {
  // Google Analytics
  if (typeof window.gtag === 'function') {
    window.gtag('event', gaEvent);
  }
  // Yandex Metrika
  if (typeof window.ym === 'function') {
    window.ym(96171108, 'reachGoal', ymEvent);
  }
}

function renderLanding() {
  // Отправляем событие просмотра экрана только один раз за сессию
  if (!sessionStorage.getItem('landingViewed')) {
    sendAnalyticsEvent('7256_page_view_var3', '7256_page_view_var3');
    sessionStorage.setItem('landingViewed', '1');
  }
  // Если уже была заглушка для этого варианта, не показываем лендинг
  if (localStorage.getItem('7256_placeholderShown_var3') === '1') {
    renderPlaceholder();
    return;
  }
  app.innerHTML = `
    <div class="landing">
      <div class="landing__header">
        <div class="landing__header-content">
          <div class="landing__header-title">Рекомендуйте</div>
          <div class="landing__header-subtitle"><span style="white-space: nowrap;">Альфа-Смарт</span></div>
          <div class="landing__header-bonuses">
            <div class="landing__bonus"><span style="white-space: nowrap;">Вам: 1 месяц бесплатно</span></div>
            <div class="landing__bonus"><span style="white-space: nowrap;">Другу: 2 месяца бесплатно</span></div>
            <div class="landing__bonus-note">Начислим после того, как друг подключит подписку</div>
          </div>
        </div>
        <div class="landing__header-icon">
          <img src="img/Image.png" alt="Бейдж" class="landing__header-icon-img" />
        </div>
      </div>
      <div class="landing__content">
        <div class="landing__privileges-title">Топ-привилегии</div>
        <ul class="landing__privileges-list">
          <li class="landing__privilege">
            <div class="landing__privilege-icon">
              <img src="img/Subtract0.png" alt="Розыгрыш" class="landing__privilege-icon-img" />
            </div>
            <div class="landing__privilege-text">
              <div class="landing__privilege-title">Розыгрыш 1 000 000 ₽</div>
              <div class="landing__privilege-desc">И других призов ежемесячно</div>
            </div>
          </li>
          <li class="landing__privilege">
            <div class="landing__privilege-icon">
              <img src="img/Subtract1.png" alt="Кэшбэк" class="landing__privilege-icon-img" />
            </div>
            <div class="landing__privilege-text">
              <div class="landing__privilege-title">4 категории кэшбэка</div>
              <div class="landing__privilege-desc">Включая 1 популярную категорию</div>
            </div>
          </li>
          <li class="landing__privilege">
            <div class="landing__privilege-icon">
              <img src="img/Subtract2.png" alt="Лимит" class="landing__privilege-icon-img" />
            </div>
            <div class="landing__privilege-text">
              <div class="landing__privilege-title">7000 ₽ в месяц</div>
              <div class="landing__privilege-desc">Лимит кэшбэка в категориях</div>
            </div>
          </li>
          <li class="landing__privilege">
            <div class="landing__privilege-icon">
              <img src="img/Subtract3.png" alt="Барабан" class="landing__privilege-icon-img" />
            </div>
            <div class="landing__privilege-text">
              <div class="landing__privilege-title">2 прокрутки барабана</div>
              <div class="landing__privilege-desc">Выше шанс выиграть до 100% кэшбэка</div>
            </div>
          </li>
          <li class="landing__privilege">
            <div class="landing__privilege-icon">
              <img src="img/Subtract4.png" alt="Проценты" class="landing__privilege-icon-img" />
            </div>
            <div class="landing__privilege-text">
              <div class="landing__privilege-title">+2% годовых к ставке по Альфа-Счёту</div>
              <div class="landing__privilege-desc">На ежедневный остаток</div>
            </div>
          </li>
        </ul>
        <button class="landing__button" id="sendBtn">Рекомендовать</button>
      </div>
    </div>
  `;
  document.getElementById('sendBtn').onclick = () => {
    sendAnalyticsEvent('7256_click_continue_var3', '7256_click_continue_var3');
    localStorage.setItem('7256_placeholderShown_var3', '1');
    renderPlaceholder();
    // Очищаем историю, чтобы нельзя было вернуться назад
    history.replaceState(null, '', location.href);
  };
}

function renderPlaceholder() {
  // Отправляем событие просмотра финальной страницы только один раз за сессию
  if (!sessionStorage.getItem('endPageViewed')) {
    sendAnalyticsEvent('7256_end_page_view_var3', '7256_end_page_view_var3');
    sessionStorage.setItem('endPageViewed', '1');
  }
  app.innerHTML = `
    <div class="placeholder">
      <img src="img/moai.png" alt="Moai" class="placeholder__img" />
      <div class="placeholder__title">Сервис ещё в работе</div>
      <div class="placeholder__desc">
        Мы выбираем лучшие условия, чтобы вам точно понравилось. С нетерпением ждём, когда всё заработает, чтобы показать вам.
      </div>
      <div class="placeholder__action">
        Пока можете подключить Альфа-Смарт или подключить семейный тариф
      </div>
    </div>
  `;
  // Очищаем историю, чтобы нельзя было вернуться назад
  history.replaceState(null, '', location.href);
}

renderLanding();
