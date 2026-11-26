import type { Category } from "./Registration.js";

export class RegistrationError extends Error {
  static duplicate(category: Category, name: string): RegistrationError {
    return new RegistrationError(`duplicate registration: ${category}/${name}`);
  }

  static mismatch(name: string, declared: string, registered: string): RegistrationError {
    return new RegistrationError(`plugin manifest mismatch: ${name} (declared: ${declared}, registered: ${registered})`);
  }
}
