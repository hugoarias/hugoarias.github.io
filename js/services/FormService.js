/** Facade pattern: wraps fetch-based form submission behind a clean interface.
 *  Swap the endpoint or transport without touching ContactForm.
 */
export class FormService {
  #endpoint;

  constructor(endpoint) {
    this.#endpoint = endpoint;
  }

  /** @param {Record<string, string>} data
   *  @returns {Promise<void>} resolves on success, rejects with Error on failure
   */
  async submit(data) {
    const response = await fetch(this.#endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Submission failed with status ${response.status}`);
    }
  }
}
