/**
 * Web Components for Shared Header and Shared Footer
 * Strict adherence to Web Components specifications, HSL theme colors,
 * SVG icons, and relative navigation links.
 */

class CustomHeader extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <header class="app-header-component">
        <style>
          .app-header-component {
            background-color: hsla(222, 22%, 10%, 0.85);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border-bottom: 1px solid var(--glass-border);
            position: sticky;
            top: 0;
            z-index: 1000;
            width: 100%;
          }
          .header-inner {
            max-width: 1280px;
            margin: 0 auto;
            padding: 14px 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 20px;
          }
          .brand-logo-wrapper {
            display: flex;
            align-items: center;
            gap: 12px;
            text-decoration: none !important;
          }
          .brand-logo-wrapper::after {
            display: none !important;
            content: none !important;
          }
          .brand-title {
            font-size: 1.25rem;
            font-weight: 800;
            color: var(--color-grey-10);
            letter-spacing: -0.02em;
            display: flex;
            flex-direction: column;
            line-height: 1.1;
          }
          .brand-subtitle {
            font-size: 0.72rem;
            font-weight: 500;
            color: var(--color-primary-7);
            letter-spacing: 0.05em;
            text-transform: uppercase;
          }
          .header-nav {
            display: flex;
            align-items: center;
            gap: 24px;
          }
          @media (max-width: 820px) {
            .header-nav {
              display: none;
            }
          }
          .header-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 6px 14px;
            border-radius: var(--radius-full);
            background-color: var(--color-grey-2);
            border: 1px solid var(--color-grey-4);
            font-size: 0.825rem;
            font-weight: 600;
            color: var(--color-grey-9);
          }
          .pulse-dot {
            width: 8px;
            height: 8px;
            border-radius: var(--radius-full);
            background-color: var(--color-green-6);
            box-shadow: 0 0 8px var(--color-green-6);
          }
        </style>
        <div class="header-inner">
          <a href="./" class="brand-logo-wrapper logo-link" title="Return to Face Verification Studio">
            <div class="icon-bubble bubble-md" style="background-color: var(--color-primary-1); border: 1px solid var(--color-primary-4);">
              <svg viewBox="0 0 24 24">
                <path d="M9 11.75c-.69 0-1.25.56-1.25 1.25s.56 1.25 1.25 1.25 1.25-.56 1.25-1.25-.56-1.25-1.25-1.25zm6 0c-.69 0-1.25.56-1.25 1.25s.56 1.25 1.25 1.25 1.25-.56 1.25-1.25-.56-1.25-1.25-1.25zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8 0-.29.02-.58.05-.86 2.36-1.05 4.23-2.98 5.21-5.37C11.07 8.33 14.05 10 17.42 10c.78 0 1.53-.09 2.25-.26.21.71.33 1.47.33 2.26 0 4.41-3.59 8-8 8z"/>
              </svg>
            </div>
            <div class="brand-title">
              <span>BiometricVerify</span>
              <span class="brand-subtitle">CPU 1:1 Facial Engine</span>
            </div>
          </a>

          <nav class="header-nav">
            <a href="#studio" class="nav-item-link" data-tab="studio">Verification Studio</a>
            <a href="#architecture" class="nav-item-link" data-tab="architecture">CPU Architecture</a>
            <a href="#about" class="nav-item-link" data-tab="about">About Us</a>
            <a href="#contact" class="nav-item-link" data-tab="contact">Contact Us</a>
            <a href="#privacy" class="nav-item-link" data-tab="privacy">Privacy</a>
            <a href="#terms" class="nav-item-link" data-tab="terms">Terms</a>
          </nav>

          <div class="header-badge" id="header-api-badge" title="Click to configure Backend API endpoint" style="cursor: pointer;">
            <div class="pulse-dot" id="header-pulse-dot"></div>
            <span id="header-backend-label">Backend: Detecting...</span>
          </div>
        </div>
      </header>
    `;

    // Hook navigation link clicks
    this.querySelectorAll('.header-nav a').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = link.getAttribute('data-tab');
        if (window.switchAppTab) {
          window.switchAppTab(tab);
        }
      });
    });
  }
}

class CustomFooter extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <footer class="app-footer-component">
        <style>
          .app-footer-component {
            background-color: var(--color-grey-1);
            border-top: 1px solid var(--color-grey-4);
            padding: 48px 20px 32px 20px;
            margin-top: auto;
            width: 100%;
          }
          .footer-inner {
            max-width: 1280px;
            margin: 0 auto;
            display: grid;
            grid-template-columns: 2fr 1fr 1fr 1.5fr;
            gap: 40px;
            margin-bottom: 36px;
          }
          @media (max-width: 900px) {
            .footer-inner {
              grid-template-columns: 1fr 1fr;
            }
          }
          @media (max-width: 580px) {
            .footer-inner {
              grid-template-columns: 1fr;
            }
          }
          .footer-col-title {
            font-size: 1rem;
            font-weight: 700;
            color: var(--color-grey-10);
            margin-bottom: 16px;
          }
          .footer-text {
            font-size: 0.875rem;
            color: var(--color-grey-6);
            line-height: 1.6;
            margin-bottom: 16px;
          }
          .footer-links-list {
            list-style: none;
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
          .social-icons-group {
            display: flex;
            gap: 12px;
            margin-top: 12px;
          }
          .social-bubble-link {
            text-decoration: none;
            transition: transform 0.2s ease;
          }
          .social-bubble-link:hover .icon-bubble {
            background-color: var(--color-primary-1);
            color: var(--color-primary-8);
            border-color: var(--color-primary-4);
            transform: translateY(-2px);
          }
          .footer-bottom {
            max-width: 1280px;
            margin: 0 auto;
            padding-top: 24px;
            border-top: 1px solid var(--color-grey-3);
            display: flex;
            flex-wrap: wrap;
            justify-content: space-between;
            align-items: center;
            gap: 16px;
            font-size: 0.825rem;
            color: var(--color-grey-6);
          }
        </style>
        <div class="footer-inner">
          <div>
            <div class="footer-col-title">Biometric 1:1 Facial Verification</div>
            <p class="footer-text">
              High-accuracy, open-source facial matching built for forex brokerage compliance and client KYC.
              Processes verification pairs locally on standard multi-core cloud CPUs in under 120 milliseconds without external API fees or GPU rental overhead.
            </p>
            <div class="social-icons-group">
              <!-- GitHub -->
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" class="social-bubble-link" title="GitHub Repository">
                <div class="icon-bubble bubble-sm">
                  <svg viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
                </div>
              </a>
              <!-- LinkedIn -->
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" class="social-bubble-link" title="LinkedIn">
                <div class="icon-bubble bubble-sm">
                  <svg viewBox="0 0 24 24"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76c.99 0 1.79-.8 1.79-1.79 0-.99-.8-1.79-1.79-1.79-.99 0-1.79.8-1.79 1.79 0 .99.8 1.79 1.79 1.79M5.07 18.5h2.78v-8.37H5.07v8.37z"/></svg>
                </div>
              </a>
              <!-- X / Twitter -->
              <a href="https://x.com" target="_blank" rel="noopener noreferrer" class="social-bubble-link" title="X (Twitter)">
                <div class="icon-bubble bubble-sm">
                  <svg viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </div>
              </a>
              <!-- Discord -->
              <a href="https://discord.com" target="_blank" rel="noopener noreferrer" class="social-bubble-link" title="Discord Community">
                <div class="icon-bubble bubble-sm">
                  <svg viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                </div>
              </a>
            </div>
          </div>

          <div>
            <div class="footer-col-title">Navigation</div>
            <ul class="footer-links-list">
              <li><a href="#studio" class="animated-link" onclick="window.switchAppTab('studio'); return false;">Studio</a></li>
              <li><a href="#architecture" class="animated-link" onclick="window.switchAppTab('architecture'); return false;">CPU Benchmarks</a></li>
              <li><a href="#about" class="animated-link" onclick="window.switchAppTab('about'); return false;">About Project</a></li>
              <li><a href="#contact" class="animated-link" onclick="window.switchAppTab('contact'); return false;">Contact Us</a></li>
            </ul>
          </div>

          <div>
            <div class="footer-col-title">Legal & Privacy</div>
            <ul class="footer-links-list">
              <li><a href="#privacy" class="animated-link" onclick="window.switchAppTab('privacy'); return false;">Privacy Policy</a></li>
              <li><a href="#terms" class="animated-link" onclick="window.switchAppTab('terms'); return false;">Terms of Service</a></li>
              <li><a href="#architecture" class="animated-link" onclick="window.switchAppTab('architecture'); return false;">Licensing Matrix</a></li>
            </ul>
          </div>

          <div>
            <div class="footer-col-title">Compliance Guarantee</div>
            <p class="footer-text">
              100% Zero Data Retention. Submitted facial images are processed entirely in server RAM and immediately discarded. No external commercial APIs are contacted.
            </p>
          </div>
        </div>

        <div class="footer-bottom">
          <div>&copy; 2026 Brokerage Biometric Verification Service. All Rights Reserved.</div>
          <div>CPU Inference Engine: MediaPipe BlazeFace + FaceNet Inception-ResNet-v1</div>
        </div>
      </footer>
    `;
  }
}

customElements.define('custom-header', CustomHeader);
customElements.define('custom-footer', CustomFooter);
