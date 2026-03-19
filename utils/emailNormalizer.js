/**
 * Utilidades para normalizar emails y evitar problemas de case-sensitivity
 * CRITICAL para que funcione el sistema de asignación de tareas
 */

/**
 * Normalizar un email eliminando espacios y convirtiendo a minúsculas
 * @param {string} email - Email a normalizar
 * @returns {string} Email normalizado
 */
export function normalizeEmail(email) {
  if (!email || typeof email !== 'string') return '';
  return email.toLowerCase().trim();
}

/**
 * Comparar dos emails de forma segura (case-insensitive)
 * @param {string} email1 
 * @param {string} email2 
 * @returns {boolean} true si son iguales
 */
export function emailsEqual(email1, email2) {
  return normalizeEmail(email1) === normalizeEmail(email2);
}

/**
 * Encontrar un usuario en un array por email (case-insensitive)
 * @param {Array} users - Array de usuarios
 * @param {string} email - Email a buscar
 * @returns {Object|null} Usuario encontrado o null
 */
export function findUserByEmail(users, email) {
  if (!Array.isArray(users) || !email) return null;
  const normalizedEmail = normalizeEmail(email);
  return users.find(u => normalizeEmail(u.email) === normalizedEmail);
}
/**
 * Incluir verificación case-insensitive para arrays de emails
 * @param {Array} emailArray - Array de emails
 * @param {string} emailToFind - Email a buscar
 * @returns {boolean} true si el email está en el array
 */
export function emailArrayIncludes(emailArray, emailToFind) {
  if (!Array.isArray(emailArray) || !emailToFind) return false;
  const normalized = normalizeEmail(emailToFind);
  return emailArray.some(email => normalizeEmail(email) === normalized);
}

/**
 * Contiene un array de strings el valor (case-insensitive)
 * @param {Array} array - Array de strings
 * @param {string} value - Valor a buscar
 * @returns {boolean}
 */
export function arrayIncludesCaseInsensitive(array, value) {
  if (!Array.isArray(array) || !value) return false;
  const normalized = value.toLowerCase().trim();
  return array.some(item => 
    (item?.toLowerCase?.() || '').trim() === normalized
  );
}

/**
 * Remover duplicados de array de emails (case-insensitive)
 * @param {Array} emails - Array de emails con posibles duplicados
 * @returns {Array} Array sin duplicados
 */
export function removeDuplicateEmails(emails) {
  if (!Array.isArray(emails)) return [];
  const seen = new Set();
  return emails.filter(email => {
    const normalized = normalizeEmail(email);
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

/**
 * Verificar si un usuario está en un array de asignados (case-insensitive)
 * @param {Array} assignedTo - Array de emails asignados
 * @param {string} userEmail - Email del usuario a verificar
 * @returns {boolean}
 */
export function isUserAssigned(assignedTo, userEmail) {
  if (!userEmail) return false;
  
  if (Array.isArray(assignedTo)) {
    return emailArrayIncludes(assignedTo, userEmail);
  }
  
  // Backward compatibility: string format
  return emailsEqual(assignedTo, userEmail);
}
