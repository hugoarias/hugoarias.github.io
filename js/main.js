import { Navbar }       from './components/Navbar.js';
import { HeroCanvas }   from './components/HeroCanvas.js';
import { ScrollReveal } from './components/ScrollReveal.js';
import { ContactForm }  from './components/ContactForm.js';
import { FormService }  from './services/FormService.js';
import { validators }   from './utils/validators.js';

document.addEventListener('DOMContentLoaded', () => {
  new Navbar(document.querySelector('.navbar')).init();

  new HeroCanvas(document.getElementById('hero-canvas')).init();

  new ScrollReveal('.reveal').init();

  new ContactForm(
    document.getElementById('contact-form'),
    new FormService('https://formspree.io/f/YOUR_FORM_ID'),
    validators
  ).init();

  const yearEl = document.getElementById('current-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
});
