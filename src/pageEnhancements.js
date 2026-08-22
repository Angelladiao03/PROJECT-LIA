(function initializeLiaPage() {
    const loader = document.createElement('div');
    loader.id = 'pageLoader';
    loader.className = 'page-loader';
    loader.innerHTML = '<div class="loader-content"><div class="loader-spinner"></div><span>Loading...</span></div>';
    document.body.prepend(loader);

    window.showPagePopup = function showPagePopup(message, title = 'LagroInAction', onOkay) {
        let popup = document.getElementById('liaPopup');
        if (!popup) {
            popup = document.createElement('div');
            popup.id = 'liaPopup';
            popup.className = 'lia-popup hidden';
            popup.innerHTML = '<div class="lia-popup-card" role="dialog" aria-modal="true"><h2></h2><p></p><button type="button">Okay</button></div>';
            document.body.appendChild(popup);
        }
        popup.querySelector('h2').textContent = title;
        popup.querySelector('p').textContent = message;
        popup.querySelector('.lia-popup-card').classList.remove('is-loading');
        popup.querySelector('.popup-no-button')?.remove();
        popup.classList.remove('hidden');
        const okayButton = popup.querySelector('button');
        okayButton.textContent = 'Okay';
        okayButton.disabled = false;
        okayButton.onclick = () => {
            popup.classList.add('hidden');
            if (onOkay) onOkay();
        };
        popup.onkeydown = event => {
            if (event.key === 'Enter') {
                event.preventDefault();
                okayButton.click();
            }
            if (event.key === 'Escape') popup.classList.add('hidden');
        };
        okayButton.focus();
    };

    window.handlePageLogout = function handlePageLogout() {
        let popup = document.getElementById('liaPopup');
        if (!popup) window.showPagePopup('', '');
        popup = document.getElementById('liaPopup');
        popup.querySelector('h2').textContent = 'Log Out';
        popup.querySelector('p').textContent = 'Do you want to log out?';
        const button = popup.querySelector('button');
        button.textContent = 'Yes';
        const existingNoButton = popup.querySelector('.popup-no-button');
        if (existingNoButton) existingNoButton.remove();
        const noButton = document.createElement('button');
        noButton.type = 'button';
        noButton.className = 'popup-no-button';
        noButton.textContent = 'No';
        button.insertAdjacentElement('afterend', noButton);
        popup.classList.remove('hidden');
        noButton.onclick = () => popup.classList.add('hidden');
        button.onclick = () => {
            popup.querySelector('.lia-popup-card').classList.add('is-loading');
            popup.querySelector('p').textContent = 'Logging out...';
            button.disabled = true;
            noButton.remove();
            localStorage.removeItem('lagroInActionActiveUser');
            setTimeout(() => { window.location.href = '../../index.html'; }, 450);
        };
    };

    window.addEventListener('load', () => {
        loader.classList.add('loaded');
    }, { once: true });

    window.showPageLoading = function showPageLoading(message = 'Loading...') {
        const label = loader.querySelector('.loader-content span');
        if (label) label.textContent = message;
        loader.classList.remove('loaded');
        loader.classList.add('busy');
    };

    window.hidePageLoading = function hidePageLoading() {
        loader.classList.remove('busy');
        loader.classList.add('loaded');
    };

    window.closeAllSidebars = function closeAllSidebars() {
        document.querySelectorAll('.sidebar').forEach(sidebar => {
            sidebar.classList.remove('open', 'closed', 'collapsed');
            sidebar.classList.add('closed');
        });
        document.querySelectorAll('.main-content').forEach(content => {
            content.classList.remove('sidebar-visible');
        });
    };

    window.toggleSharedSidebar = function toggleSharedSidebar(sidebar) {
        const isOpen = sidebar.classList.contains('open');
        sidebar.classList.remove('open', 'closed', 'collapsed');
        sidebar.classList.toggle('open', !isOpen);
        sidebar.classList.toggle('closed', isOpen);
        sidebar.nextElementSibling?.classList.toggle('sidebar-visible', !isOpen);
    };

    document.addEventListener('DOMContentLoaded', () => {
        let activeUser = null;
        try {
            activeUser = JSON.parse(localStorage.getItem('lagroInActionActiveUser') || 'null');
        } catch (error) {
            activeUser = null;
        }
        document.querySelectorAll('.user-name').forEach(element => {
            if (activeUser?.fullName) element.textContent = activeUser.fullName;
        });

        document.querySelectorAll('.topbar-center').forEach(title => {
            title.textContent = 'PROJECT LIA';
            title.setAttribute('role', 'link');
            title.setAttribute('tabindex', '0');
            const goHome = () => {
                const homePath = window.location.pathname.includes('/Admin/')
                    ? '../adminHome/adminHome.html'
                    : '../studentHome/studentHome.html';
                window.showPageLoading();
                window.location.href = homePath;
            };
            title.addEventListener('click', goHome);
            title.addEventListener('keydown', event => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    goHome();
                }
            });
        });

        document.querySelectorAll('a[href]').forEach(link => {
            const href = link.getAttribute('href');
            if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('javascript:')) return;
            if (window.location.pathname.includes('/studentReports/') && href.includes('studentReports.html')) return;
            link.addEventListener('click', () => window.showPageLoading());
        });
        document.querySelectorAll('button[onclick*="window.location"]').forEach(button => {
            button.addEventListener('click', () => window.showPageLoading());
        });
        document.querySelectorAll('.menu-btn').forEach(button => {
            const sidebar = button.closest('header')?.parentElement?.querySelector('.sidebar') || document.querySelector('.sidebar');
            if (!sidebar) return;
            button.onclick = event => {
                event.preventDefault();
                window.toggleSharedSidebar(sidebar);
            };
        });
        document.querySelectorAll('.sidebar a').forEach(link => {
            const targetUrl = new URL(link.href, window.location.href);
            const currentUrl = new URL(window.location.href);
            if (targetUrl.pathname === currentUrl.pathname) return;
            link.addEventListener('click', () => {
                closeAllSidebars();
                window.showPageLoading();
            });
        });
        document.querySelectorAll('form').forEach(form => {
            if (form.getAttribute('onsubmit')?.includes('handleSosSubmit')) {
                form.addEventListener('submit', closeAllSidebars);
            }
        });

        document.querySelectorAll('.sidebar').forEach(sidebar => {
            const links = [...sidebar.querySelectorAll('.nav-item a')];
            const messageItem = links.find(link => link.textContent.trim() === 'Message')?.closest('.nav-item');
            const accountItem = links.find(link => link.textContent.trim() === 'My Account')?.closest('.nav-item');
            if (messageItem && accountItem) accountItem.parentElement.insertBefore(messageItem, accountItem);

            if (activeUser?.role === 'admin' && !sidebar.querySelector('.sidebar-bottom')) {
                sidebar.insertAdjacentHTML('beforeend', '<div class="sidebar-bottom"><button type="button" class="sidebar-logout" onclick="handlePageLogout()">Log Out</button></div>');
            }

            const isAccountPage = window.location.pathname.includes('/studentReports/');
            if (activeUser?.role === 'student' && isAccountPage && accountItem && !accountItem.querySelector('.account-menu')) {
                accountItem.insertAdjacentHTML('beforeend', '<ul class="account-menu open"><li><button type="button" class="sidebar-logout" onclick="handlePageLogout()">Log Out</button></li></ul>');
                const accountLink = accountItem.querySelector('a');
                accountLink.addEventListener('click', event => {
                    event.preventDefault();
                    accountItem.querySelector('.account-menu').classList.toggle('open');
                });
            }
        });

        closeAllSidebars();
    });
})();
