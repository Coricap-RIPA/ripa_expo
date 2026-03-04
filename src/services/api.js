/**
 * Client API RIPA – communication avec le backend (contrôleur Apiapp)
 * Base URL à adapter selon l'environnement (localhost, IP du Mac, ou URL de prod).
 */
const API_BASE_URL = 'http://192.168.10.106/ripa/index.php/api/app';

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

/** Liste des cartes (token requis) */
export function getCards(token) {
  return apiRequest('/cards', { method: 'GET', token });
}

/** Enregistrer une carte physique — pan, expiry (MM/YY), cvv, pin. KYC requis. */
export function registerCard(token, pan, expiry, cvv, pin) {
  return apiRequest('/cards/register', { method: 'POST', body: { pan, expiry, cvv, pin }, token });
}

/** Récupérer le statut KYC (token requis) */
export function getKyc(token) {
  return apiRequest('/kyc', { method: 'GET', token });
}

/** Soumettre le KYC — nom, post_nom, prenom, date_naissance, adresse, photo_piece_identite, photo_utilisateur (base64) */
export function submitKyc(token, data) {
  return apiRequest('/kyc/submit', { method: 'POST', body: data, token });
}
