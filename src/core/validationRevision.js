// Library-owned revision capability, separate from the public custom-field hook.
// This is an internal convention, not a security or subclass-correctness boundary.
export const validationRevision = Symbol("taet.validationRevision");
