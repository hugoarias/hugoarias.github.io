import { qs, qsAll } from '../utils/domUtils.js';

/** Handles form validation and submission.
 *  Depends on injected FormService and validators (DIP + Strategy pattern).
 */
export class ContactForm {
  #formEl;
  #formService;
  #validators;
  #statusEl;
  #submitBtn;

  constructor(formEl, formService, validators) {
    this.#formEl      = formEl;
    this.#formService = formService;
    this.#validators  = validators;
    this.#statusEl    = document.getElementById('form-status');
    this.#submitBtn   = qs('[type="submit"]', formEl);
  }

  init() {
    this.#bindFieldValidation();
    this.#formEl.addEventListener('submit', (e) => this.#handleSubmit(e));
  }

  #bindFieldValidation() {
    qsAll('input, textarea', this.#formEl).forEach((field) => {
      field.addEventListener('blur', () => this.#validateField(field));
      field.addEventListener('input', () => {
        if (field.getAttribute('aria-invalid') === 'true') {
          this.#validateField(field);
        }
      });
    });
  }

  #validateField(field) {
    const validate = this.#validators[field.name];
    if (!validate) return true;

    const result  = validate(field.value);
    const isValid = result === true;
    const errorEl = document.getElementById(`${field.name}-error`);

    if (errorEl) errorEl.textContent = isValid ? '' : result;
    field.setAttribute('aria-invalid', isValid ? 'false' : 'true');
    return isValid;
  }

  #validateAll() {
    return qsAll('input, textarea', this.#formEl).every((f) =>
      this.#validateField(f)
    );
  }

  async #handleSubmit(e) {
    e.preventDefault();
    if (!this.#validateAll()) return;

    this.#setLoading(true);
    this.#clearStatus();

    try {
      await this.#formService.submit(
        Object.fromEntries(new FormData(this.#formEl))
      );
      this.#showStatus("Message sent! I'll get back to you soon.", 'success');
      this.#formEl.reset();
      qsAll('input, textarea', this.#formEl).forEach((f) =>
        f.removeAttribute('aria-invalid')
      );
    } catch {
      this.#showStatus(
        'Something went wrong. Please try emailing me directly.',
        'error'
      );
    } finally {
      this.#setLoading(false);
    }
  }

  #setLoading(loading) {
    this.#submitBtn.disabled = loading;
    this.#submitBtn.innerHTML = loading
      ? '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Sending…'
      : '<i class="fa-solid fa-paper-plane" aria-hidden="true"></i> Send Message';
  }

  #showStatus(message, type) {
    if (!this.#statusEl) return;
    this.#statusEl.textContent = message;
    this.#statusEl.className = `contact__form-status contact__form-status--${type}`;
  }

  #clearStatus() {
    if (!this.#statusEl) return;
    this.#statusEl.textContent = '';
    this.#statusEl.className = 'contact__form-status';
  }
}
