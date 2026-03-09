/**
 * Client API RIPA – communication avec le backend (contrôleur Apiapp)
 * Base URL à adapter selon l'environnement (localhost, IP du Mac, ou URL de prod).
 */
const API_BASE_URL = 'http://192.168.1.156/ripa/index.php/api/app';

/**
 * Effectue une requête vers l'API RIPA.
 * @param {string} endpoint - Ex: '/register', '/verify-otp', '/login'
 * @param {object} options - { method, body, token }
 * @returns {Promise<object>} - Réponse JSON (data, message, success)
 */
export async function apiRequest(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  const config = {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };
  if (options.body && (options.method === 'POST' || options.method === 'PUT')) {
    config.body = JSON.stringify(options.body);
  }
  if (options.token) {
    config.headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(url, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data.message || `Erreur ${response.status}`;
    const err = new Error(message);
    err.status = response.status;
    throw err;
  }
  return data;
}

/** Inscription : nom, post_nom, prenom, tel (avec +), pin (5 chiffres) */
export function register(body) {
  return apiRequest('/register', { method: 'POST', body });
}

/** Vérification OTP → retourne token + user (connexion automatique) */
export function verifyOtp(userId, otpCode) {
  return apiRequest('/verify-otp', { method: 'POST', body: { user_id: userId, otp_code: otpCode } });
}

/** Renvoyer un code OTP */
export function resendOtp(userId) {
  return apiRequest('/resend-otp', { method: 'POST', body: { user_id: userId } });
}

/** Connexion : phone (avec +), pin (5 chiffres) */
export function login(phone, pin) {
  return apiRequest('/login', { method: 'POST', body: { phone, pin } });
}

/** Vérifier si le token est encore valide (au démarrage de l'app) */
export function verifyToken(token) {
  return apiRequest('/verify-token', { method: 'GET', token });
}

/** Déverrouiller avec le PIN (token stocké + PIN 5 chiffres) */
export function verifyPin(token, pin) {
  return apiRequest('/verify-pin', { method: 'POST', body: { pin }, token });
}

/** Liste des comptes mobile money (token requis) */
export function getAccounts(token) {
  return apiRequest('/accounts', { method: 'GET', token });
}

/** Ajouter un compte mobile money — num_compte avec +, pin (5 chiffres) */
export function addAccount(token, numCompte, pin) {
  return apiRequest('/accounts/add', { method: 'POST', body: { num_compte: numCompte, pin }, token });
}

/** Supprimer un compte mobile money — id, pin */
export function deleteAccount(token, id, pin) {
  return apiRequest('/accounts/delete', { method: 'POST', body: { id, pin }, token });
}

/** Mettre à jour un compte mobile money (ex: défaut) — id, is_default, pin */
export function updateAccount(token, id, is_default, pin) {
  return apiRequest('/accounts/update', { method: 'POST', body: { id, is_default, pin }, token });
}

/** Liste des comptes bancaires */
export function getBankAccounts(token) {
  return apiRequest('/accounts/bank', { method: 'GET', token });
}

/** Ajouter un compte bancaire — nom_banque, num_compte, pin */
export function addBankAccount(token, nom_banque, num_compte, pin) {
  return apiRequest('/accounts/bank/add', { method: 'POST', body: { nom_banque, num_compte, pin }, token });
}

/** Modifier un compte bancaire — id, nom_banque?, num_compte?, pin */
export function updateBankAccount(token, id, data, pin) {
  return apiRequest('/accounts/bank/update', { method: 'POST', body: { id, ...data, pin }, token });
}

/** Supprimer un compte bancaire — id, pin */
export function deleteBankAccount(token, id, pin) {
  return apiRequest('/accounts/bank/delete', { method: 'POST', body: { id, pin }, token });
}

/** Liste des cartes (token requis) */
export function getCards(token) {
  return apiRequest('/cards', { method: 'GET', token });
}

/** Enregistrer une carte physique — pan, expiry (MM/YY), cvv, pin. KYC requis. */
export function registerCard(token, pan, expiry, cvv, pin) {
  return apiRequest('/cards/register', { method: 'POST', body: { pan, expiry, cvv, pin }, token });
}

/** Commander une carte virtuelle — brand: 'visa'|'mastercard', pin. KYC + Mobile Money requis. */
export function orderVirtualCard(token, brand, pin) {
  return apiRequest('/cards/order-virtual', { method: 'POST', body: { brand, pin }, token });
}

/** Supprimer une carte — id, pin */
export function deleteCard(token, id, pin) {
  return apiRequest('/cards/delete', { method: 'POST', body: { id, pin }, token });
}

/** Recharger la carte virtuelle depuis Mobile Money — card_id, account_id, amount, pin (simulation Onafriq) */
export function cardRecharge(token, cardId, accountId, amount, pin) {
  return apiRequest('/cards/recharge', { method: 'POST', body: { card_id: cardId, account_id: accountId, amount, pin }, token });
}

/** Retrait carte virtuelle vers Mobile Money — card_id, account_id, amount, pin (simulation Onafriq) */
export function cardWithdraw(token, cardId, accountId, amount, pin) {
  return apiRequest('/cards/withdraw', { method: 'POST', body: { card_id: cardId, account_id: accountId, amount, pin }, token });
}

/** Récupérer le statut KYC (token requis) */
export function getKyc(token) {
  return apiRequest('/kyc', { method: 'GET', token });
}

/** Soumettre le KYC — nom, post_nom, prenom, date_naissance, adresse, photo_piece_identite, photo_utilisateur (base64) */
export function submitKyc(token, data) {
  return apiRequest('/kyc/submit', { method: 'POST', body: data, token });
}

/** Liste des notifications (token requis). Option: unread_only=1 */
export function getNotifications(token, unreadOnly = false) {
  const q = unreadOnly ? '?unread_only=1' : '';
  return apiRequest(`/notifications${q}`, { method: 'GET', token });
}

/** Marquer notifications comme lues — body: { ids: [1,2] } ou { all: true } */
export function markNotificationsRead(token, body) {
  return apiRequest('/notifications/read', { method: 'POST', body, token });
}

/** Transactions récentes (paiements, réceptions, transferts, recharge/décharge carte). limit optionnel (défaut 20). */
export function getRecentTransactions(token, limit = 20) {
  return apiRequest(`/transactions/recent?limit=${limit}`, { method: 'GET', token });
}
