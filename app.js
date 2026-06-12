// ============================================
// MUNDIAL RETO - VERSIÓN CON API REAL
// ============================================

// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCOSIE_p6nmBuA5_Yeqcqh845VrSTQb_gQ",
    authDomain: "mundialreto.firebaseapp.com",
    databaseURL: "https://mundialreto-default-rtdb.firebaseio.com",
    projectId: "mundialreto",
    storageBucket: "mundialreto.firebasestorage.app",
    messagingSenderId: "982485023841",
    appId: "1:982485023841:web:a4f9f774f4b76c9fff7e20"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Inicializar Telegram
const webApp = window.Telegram.WebApp;
webApp.ready();
webApp.expand();

// Datos del usuario
let telegramUser = webApp.initDataUnsafe?.user || {
    id: Date.now(),
    first_name: "Jugador",
    username: "visitante"
};
let userId = telegramUser.id.toString();
let userName = telegramUser.first_name || telegramUser.username || "Jugador";

// Estado global
let userPoints = 0;
let userStreak = 0;
let lastLoginDate = "";
let predicciones = {};
let partidosActivos = [];

// API KEY de Football-Data.org
const API_KEY = "264eb6c28c1b45cb95ec356665c49db5";

// Cargar datos del usuario
async function loadUserData() {
    const snapshot = await database.ref(`usuarios/${userId}`).once('value');
    const data = snapshot.val();
    
    if (data) {
        userPoints = data.puntos || 0;
        userStreak = data.racha || 0;
        lastLoginDate = data.ultimo_login || "";
        predicciones = data.predicciones || {};
        
        const today = new Date().toDateString();
        if (lastLoginDate !== today) {
            await checkDailyReward();
        }
    } else {
        userPoints = 10;
        userStreak = 0;
        lastLoginDate = new Date().toDateString();
        predicciones = {};
        await saveUserData();
    }
    
    updateUI();
}

// Guardar datos
async function saveUserData() {
    await database.ref(`usuarios/${userId}`).set({
        nombre: userName,
        puntos: userPoints,
        racha: userStreak,
        ultimo_login: lastLoginDate,
        predicciones: predicciones,
        ultima_actualizacion: Date.now()
    });
    
    await database.ref(`puntuaciones_globales/${userId}`).set({
        nombre: userName,
        puntos: userPoints,
        actualizado: Date.now()
    });
}

// Actualizar interfaz
function updateUI() {
    document.getElementById('userName').textContent = userName;
    document.getElementById('userPoints').textContent = userPoints;
    document.getElementById('userStreak').innerHTML = `🔥 Racha: ${userStreak}`;
    
    let rank = "Novato";
    if (userPoints >= 351) rank = "Leyenda 🔴";
    else if (userPoints >= 201) rank = "Maestro 🟠";
    else if (userPoints >= 101) rank = "Experto 🟣";
    else if (userPoints >= 51) rank = "Analista 🔵";
    else if (userPoints >= 21) rank = "Aprendiz 🟢";
    document.getElementById('userRank').textContent = rank;
}

// Recompensa diaria
async function checkDailyReward() {
    const today = new Date().toDateString();
    if (lastLoginDate !== today) {
        let bonus = Math.min(userStreak + 1, 7);
        if (userStreak === 0) bonus = 1;
        
        userPoints += bonus;
        if (bonus === 7) userPoints += 5;
        
        lastLoginDate = today;
        userStreak++;
        await saveUserData();
        updateUI();
        webApp.showAlert(`🎁 Recompensa diaria: +${bonus} puntos`);
    }
}

// Cargar partidos desde API
async function loadMatches() {
    const container = document.getElementById('partidosContainer');
    container.innerHTML = '<div class="loading">📡 Cargando partidos del día...</div>';
    
    try {
        // Primero intentar desde caché de Firebase
        const cachedSnapshot = await database.ref(`partidos_cache`).once('value');
        const cached = cachedSnapshot.val();
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        
        // Si hay caché de hoy, usarlo
        if (cached && cached.fecha === hoy.toDateString() && cached.partidos) {
            partidosActivos = cached.partidos;
            renderMatches();
            return;
        }
        
        // Si no, llamar a la API
        const response = await fetch(`https://api.football-data.org/v4/matches`, {
            headers: { 'X-Auth-Token': API_KEY }
        });
        
        if (!response.ok) throw new Error(`Error ${response.status}`);
        
        const data = await response.json();
        
        // Filtrar solo partidos de hoy
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const manana = new Date(hoy);
        manana.setDate(hoy.getDate() + 1);
        
        const partidosHoy = data.matches.filter(match => {
            const fechaPartido = new Date(match.utcDate);
            fechaPartido.setHours(0, 0, 0, 0);
            return fechaPartido.getTime() === hoy.getTime() && match.status === 'SCHEDULED';
        });
        
        if (partidosHoy.length === 0) {
            container.innerHTML = '<div class="loading">📭 No hay partidos programados para hoy</div>';
            partidosActivos = [];
            return;
        }
        
        partidosActivos = partidosHoy.map(match => ({
            id: match.id,
            local: match.homeTeam.name,
            visita: match.awayTeam.name,
            fecha: new Date(match.utcDate).toLocaleDateString('es-ES'),
            hora: new Date(match.utcDate).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
            status: match.status,
            utcDate: match.utcDate
        }));
        
        // Guardar en caché
        await database.ref(`partidos_cache`).set({
            fecha: hoy.toDateString(),
            partidos: partidosActivos,
            actualizado: Date.now()
        });
        
        renderMatches();
        
    } catch (error) {
        console.error("Error en API:", error);
        container.innerHTML = '<div class="loading">❌ Error al cargar partidos. ¿Tienes VPN activada?</div>';
        partidosActivos = [];
    }
}

// Mostrar partidos
function renderMatches() {
    const container = document.getElementById('partidosContainer');
    if (!container) return;
    
    if (partidosActivos.length === 0) {
        container.innerHTML = '<div class="loading">📭 No hay partidos para hoy</div>';
        return;
    }
    
    container.innerHTML = partidosActivos.map(partido => {
        const yaPredicho = predicciones[partido.id];
        return `
            <div class="partido-card ${yaPredicho ? 'predicho' : ''}">
                <div class="partido-info">
                    <div class="equipos">
                        <span class="equipo-local">${partido.local}</span>
                        <span class="vs">VS</span>
                        <span class="equipo-visita">${partido.visita}</span>
                    </div>
                    <div class="hora-partido">${partido.fecha} - ${partido.hora}</div>
                </div>
                ${!yaPredicho ? 
                    `<button class="btn-predecir" data-id="${partido.id}">🔮 PREDECIR</button>` : 
                    `<div style="text-align:center; margin-top:8px;">✅ Predicción guardada</div>`
                }
            </div>
        `;
    }).join('');
    
    document.querySelectorAll('.btn-predecir').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const partidoId = parseInt(btn.dataset.id);
            const partido = partidosActivos.find(p => p.id === partidoId);
            if (partido) openPredictionModal(partido);
        });
    });
}

// Modal de predicción
let currentPartido = null;

function openPredictionModal(partido) {
    currentPartido = partido;
    const modal = document.getElementById('prediccionModal');
    document.getElementById('modalPartido').textContent = `${partido.local} vs ${partido.visita}`;
    modal.classList.add('active');
    
    document.querySelector('.goles-input').style.display = 'none';
    document.querySelectorAll('.opcion-btn').forEach(btn => btn.style.background = 'rgba(255,255,255,0.1)');
}

document.querySelectorAll('.opcion-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.opcion-btn').forEach(b => b.style.background = 'rgba(255,255,255,0.1)');
        btn.style.background = '#2ecc71';
        
        if (btn.dataset.resultado !== 'empate') {
            document.querySelector('.goles-input').style.display = 'block';
        } else {
            document.querySelector('.goles-input').style.display = 'none';
            document.getElementById('confirmarExacto').click();
        }
    });
});

document.getElementById('confirmarExacto').onclick = async () => {
    const seleccionado = document.querySelector('.opcion-btn[style*="background: #2ecc71"]');
    if (!seleccionado) {
        webApp.showAlert("Selecciona un resultado primero");
        return;
    }
    
    const resultado = seleccionado.dataset.resultado;
    let puntosGanados = 1;
    
    if (resultado !== 'empate') {
        const golesLocal = parseInt(document.getElementById('golesLocal').value) || 0;
        const golesVisita = parseInt(document.getElementById('golesVisita').value) || 0;
        
        if (resultado === 'local' && golesLocal > golesVisita) puntosGanados = 3;
        else if (resultado === 'visitante' && golesVisita > golesLocal) puntosGanados = 3;
        else puntosGanados = 2;
    }
    
    predicciones[currentPartido.id] = {
        prediccion: resultado,
        puntos_obtenidos: puntosGanados,
        timestamp: Date.now(),
        acertado: true
    };
    
    userPoints += puntosGanados;
    await saveUserData();
    updateUI();
    
    webApp.showAlert(`✅ +${puntosGanados} puntos!`);
    document.getElementById('prediccionModal').classList.remove('active');
    renderMatches();
};

document.querySelector('.modal-close').onclick = () => {
    document.getElementById('prediccionModal').classList.remove('active');
};

// Ranking
async function loadRanking() {
    const container = document.getElementById('rankingList');
    if (!container) return;
    
    container.innerHTML = '<div class="loading">Cargando ranking...</div>';
    
    const snapshot = await database.ref('puntuaciones_globales').once('value');
    const data = snapshot.val();
    
    if (!data) {
        container.innerHTML = '<div class="loading">Sin datos aún</div>';
        return;
    }
    
    const ranking = Object.entries(data)
        .filter(([_, value]) => value && typeof value.puntos === 'number')
        .map(([id, value]) => ({ id, nombre: value.nombre || "Jugador", puntos: value.puntos || 0 }))
        .sort((a, b) => b.puntos - a.puntos)
        .slice(0, 20);
    
    if (ranking.length === 0) {
        container.innerHTML = '<div class="loading">Sin datos aún</div>';
        return;
    }
    
    container.innerHTML = ranking.map((user, idx) => `
        <div class="ranking-item">
            <div class="ranking-pos ${idx === 0 ? 'top1' : idx === 1 ? 'top2' : idx === 2 ? 'top3' : ''}">
                ${idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : (idx+1)}
            </div>
            <div class="ranking-name">${user.nombre}</div>
            <div class="ranking-points">${user.puntos} pts</div>
        </div>
    `).join('');
}

// Invitar amigos
function shareInvite() {
    const inviteLink = `https://t.me/share/url?url=🏆 Mundial Reto&text=¡Predice los partidos del mundial y gana puntos! https://t.me/MundialRetoBot`;
    webApp.openTelegramLink(inviteLink);
    userPoints += 2;
    saveUserData();
    updateUI();
    webApp.showAlert("👥 +2 puntos por invitar!");
}

// Ver anuncio (simulado hasta integrar AdsGram)
function watchAd() {
    userPoints += 0.5;
    saveUserData();
    updateUI();
    webApp.showAlert("🎬 +0.5 puntos!");
}

// Inicializar todo
document.addEventListener('DOMContentLoaded', async () => {
    await loadUserData();
    await loadMatches();
    await loadRanking();
    
    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`tab-${tabId}`).classList.add('active');
            if (tabId === 'ranking') loadRanking();
        });
    });
    
    document.getElementById('btnInvitar')?.addEventListener('click', shareInvite);
    document.getElementById('btnAd')?.addEventListener('click', watchAd);
    document.getElementById('dailyReward')?.addEventListener('click', () => checkDailyReward());
});

console.log("✅ Mundial Reto - Versión con API real");