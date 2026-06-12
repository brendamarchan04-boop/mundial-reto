// ============================================
// CONFIGURACIÓN INICIAL
// ============================================

// Tu configuración de Firebase
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

// Inicializar Telegram WebApp
const webApp = window.Telegram.WebApp;
webApp.ready();
webApp.expand();

// Datos del usuario de Telegram
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
let powerups = { double: 0, shield: false, hint: 0 };
let amigosInv = 0;

// API Football Data
const API_KEY = "264eb6c28c1b45cb95ec356665c49db5";
const COMPETITION_ID = 2000; // Mundial (ID en Football-Data.org)

// ============================================
// FUNCIONES PRINCIPALES
// ============================================

// Cargar datos del usuario desde Firebase
async function loadUserData() {
    const snapshot = await database.ref(`usuarios/${userId}`).once('value');
    const data = snapshot.val();
    
    if (data) {
        userPoints = data.puntos || 0;
        userStreak = data.racha || 0;
        lastLoginDate = data.ultimo_login || "";
        predicciones = data.predicciones || {};
        powerups = data.powerups || { double: 0, shield: false, hint: 0 };
        amigosInv = data.amigos_invitados || 0;
        
        // Verificar recompensa diaria
        const today = new Date().toDateString();
        if (lastLoginDate !== today) {
            checkDailyReward();
        }
    } else {
        // Nuevo usuario
        userPoints = 10; // Bonus de bienvenida
        userStreak = 0;
        lastLoginDate = new Date().toDateString();
        predicciones = {};
        powerups = { double: 0, shield: false, hint: 0 };
        amigosInv = 0;
        await saveUserData();
    }
    
    updateUI();
}

// Guardar datos del usuario en Firebase
async function saveUserData() {
    await database.ref(`usuarios/${userId}`).set({
        nombre: userName,
        puntos: userPoints,
        racha: userStreak,
        ultimo_login: lastLoginDate,
        predicciones: predicciones,
        powerups: powerups,
        amigos_invitados: amigosInv,
        ultima_actualizacion: Date.now()
    });
    
    // Actualizar ranking global
    await database.ref(`puntuaciones_globales/${userId}`).set({
        nombre: userName,
        puntos: userPoints,
        actualizado: Date.now()
    });
}

// Actualizar UI con datos del usuario
function updateUI() {
    document.getElementById('userName').textContent = userName;
    document.getElementById('userPoints').textContent = userPoints;
    document.getElementById('userStreak').innerHTML = `🔥 Racha: ${userStreak}`;
    document.getElementById('totalAciertos').textContent = Object.keys(predicciones).filter(k => predicciones[k].acertado).length;
    document.getElementById('exactos').textContent = Object.keys(predicciones).filter(k => predicciones[k].exacto).length;
    document.getElementById('diasStreak').textContent = userStreak;
    document.getElementById('amigosInv').textContent = amigosInv;
    
    // Actualizar rango
    let rank = "Novato";
    if (userPoints >= 351) rank = "Leyenda 🔴";
    else if (userPoints >= 201) rank = "Maestro 🟠";
    else if (userPoints >= 101) rank = "Experto 🟣";
    else if (userPoints >= 51) rank = "Analista 🔵";
    else if (userPoints >= 21) rank = "Aprendiz 🟢";
    document.getElementById('userRank').textContent = rank;
    
    updateAchievements();
}

// Recompensa diaria
async function checkDailyReward() {
    const today = new Date().toDateString();
    if (lastLoginDate !== today) {
        let bonus = Math.min(userStreak + 1, 7);
        if (userStreak === 0) bonus = 1;
        
        userPoints += bonus;
        
        if (bonus === 7) {
            userPoints += 5;
            webApp.showAlert(`🎉 ¡SÉPTIMO DÍA! +${bonus} puntos + bono de 5 puntos`);
        } else {
            webApp.showAlert(`🎁 Recompensa diaria: +${bonus} puntos`);
        }
        
        lastLoginDate = today;
        userStreak++;
        await saveUserData();
        updateUI();
        
        document.getElementById('dailyReward').style.display = 'none';
    } else {
        document.getElementById('dailyReward').style.display = 'none';
    }
}

// Actualizar logros
function updateAchievements() {
    const achievements = [
        { id: "streak3", name: "🔥 En Rachas", condition: userStreak >= 3, icon: "🔥" },
        { id: "profeta", name: "👑 Profeta", condition: Object.keys(predicciones).filter(k => predicciones[k].acertado).length >= 10, icon: "👑" },
        { id: "influyente", name: "🤝 Influyente", condition: amigosInv >= 5, icon: "🤝" },
        { id: "perfecto", name: "⭐ Perfecto", condition: Object.keys(predicciones).filter(k => predicciones[k].exacto).length >= 3, icon: "⭐" },
        { id: "fiel", name: "📅 Fiel", condition: userStreak >= 7, icon: "📅" }
    ];
    
    const container = document.getElementById('achievementsList');
    if (container) {
        container.innerHTML = achievements.map(ach => `
            <div class="achievement-item">
                <span class="achievement-icon">${ach.icon}</span>
                <span class="achievement-name">${ach.name}</span>
                <span class="achievement-status ${ach.condition ? 'unlocked' : 'locked'}">
                    ${ach.condition ? '✅' : '🔒'}
                </span>
            </div>
        `).join('');
    }
}

// Cargar partidos desde Football-Data.org
async function loadMatches() {
    const container = document.getElementById('partidosContainer');
    container.innerHTML = '<div class="loading">Cargando partidos...</div>';
    
    try {
        // Intentar cargar desde Firebase primero (caché)
        const cachedSnapshot = await database.ref(`partidos`).once('value');
        const cached = cachedSnapshot.val();
        
        if (cached && cached.fecha_actualizacion && (Date.now() - cached.fecha_actualizacion) < 3600000) {
            partidosActivos = cached.partidos || [];
            renderMatches();
            return;
        }
        
        // Llamar a la API
        const response = await fetch(`https://api.football-data.org/v4/competitions/WC/matches`, {
            headers: { 'X-Auth-Token': API_KEY }
        });
        
        if (!response.ok) throw new Error('Error al cargar partidos');
        
        const data = await response.json();
        
        partidosActivos = data.matches
            .filter(match => match.status === 'SCHEDULED' || match.status === 'IN_PLAY' || match.status === 'FINISHED')
            .slice(0, 10) // Últimos 10 partidos
            .map(match => ({
                id: match.id,
                local: match.homeTeam.name,
                visita: match.awayTeam.name,
                fecha: new Date(match.utcDate).toLocaleDateString('es-ES'),
                hora: new Date(match.utcDate).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
                status: match.status,
                resultado: match.score?.fullTime?.home !== null ? {
                    local: match.score.fullTime.home,
                    visita: match.score.fullTime.away
                } : null
            }));
        
        // Guardar en caché
        await database.ref(`partidos`).set({
            partidos: partidosActivos,
            fecha_actualizacion: Date.now()
        });
        
        renderMatches();
        
    } catch (error) {
        console.error("Error loading matches:", error);
        container.innerHTML = '<div class="loading">Error al cargar partidos. Usando datos de ejemplo.</div>';
        loadMockMatches();
    }
}

// Partidos de ejemplo (fallback)
function loadMockMatches() {
    partidosActivos = [
        { id: 1, local: "Argentina", visita: "Brasil", fecha: "25/06/2026", hora: "16:00", status: "SCHEDULED", resultado: null },
        { id: 2, local: "España", visita: "Francia", fecha: "26/06/2026", hora: "20:00", status: "SCHEDULED", resultado: null },
        { id: 3, local: "Inglaterra", visita: "Alemania", fecha: "27/06/2026", hora: "18:00", status: "SCHEDULED", resultado: null },
        { id: 4, local: "Portugal", visita: "Países Bajos", fecha: "28/06/2026", hora: "15:00", status: "SCHEDULED", resultado: null }
    ];
    renderMatches();
}

// Renderizar lista de partidos
function renderMatches() {
    const container = document.getElementById('partidosContainer');
    if (!container) return;
    
    if (partidosActivos.length === 0) {
        container.innerHTML = '<div class="loading">No hay partidos programados</div>';
        return;
    }
    
    container.innerHTML = partidosActivos.map(partido => {
        const yaPredicho = predicciones[partido.id];
        const estaFinalizado = partido.status === 'FINISHED';
        const estadoTexto = estaFinalizado ? '✅ Finalizado' : (partido.status === 'IN_PLAY' ? '🟢 En vivo' : '📅 Programado');
        
        return `
            <div class="partido-card ${yaPredicho ? 'predicho' : ''} ${estaFinalizado ? 'cerrado' : ''}">
                <div class="partido-info">
                    <div class="equipos">
                        <span class="equipo-local">${partido.local}</span>
                        <span class="vs">VS</span>
                        <span class="equipo-visita">${partido.visita}</span>
                    </div>
                    <div class="hora-partido">${partido.fecha} ${partido.hora}</div>
                </div>
                <div class="estado-partido ${estaFinalizado ? 'finalizado' : ''}">${estadoTexto}</div>
                ${!estaFinalizado && !yaPredicho ? 
                    `<button class="btn-predecir" data-id="${partido.id}">🔮 PREDECIR</button>` : 
                    yaPredicho ? `<div style="text-align:center; margin-top:8px;">✅ Predicción guardada</div>` : ''
                }
            </div>
        `;
    }).join('');
    
    // Agregar eventos a los botones
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
    const modalTitle = document.getElementById('modalPartido');
    modalTitle.textContent = `${partido.local} vs ${partido.visita}`;
    modal.classList.add('active');
    
    // Resetear inputs
    document.querySelector('.goles-input').style.display = 'none';
    document.querySelectorAll('.opcion-btn').forEach(btn => btn.style.background = 'rgba(255,255,255,0.1)');
}

document.querySelectorAll('.opcion-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        // Resetear colores
        document.querySelectorAll('.opcion-btn').forEach(b => b.style.background = 'rgba(255,255,255,0.1)');
        btn.style.background = '#2ecc71';
        
        const resultado = btn.dataset.resultado;
        if (resultado !== 'empate') {
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
    let puntosGanados = 1; // Solo ganador
    
    if (resultado !== 'empate') {
        const golesLocal = parseInt(document.getElementById('golesLocal').value) || 0;
        const golesVisita = parseInt(document.getElementById('golesVisita').value) || 0;
        
        if (isNaN(golesLocal) || isNaN(golesVisita)) {
            webApp.showAlert("Ingresa los goles correctamente");
            return;
        }
        
        if (resultado === 'local' && golesLocal > golesVisita) puntosGanados = 3;
        else if (resultado === 'visitante' && golesVisita > golesLocal) puntosGanados = 3;
        else puntosGanados = 2;
    }
    
    // Aplicar powerup de doble puntos si está activo
    if (powerups.double > 0) {
        puntosGanados *= 2;
        powerups.double--;
        webApp.showAlert(`🔮 ¡COMODÍN ACTIVADO! Puntos duplicados: +${puntosGanados}`);
    }
    
    // Guardar predicción
    predicciones[currentPartido.id] = {
        prediccion: resultado,
        puntos_obtenidos: puntosGanados,
        timestamp: Date.now(),
        goles_local: parseInt(document.getElementById('golesLocal').value) || 0,
        goles_visita: parseInt(document.getElementById('golesVisita').value) || 0
    };
    
    userPoints += puntosGanados;
    await saveUserData();
    updateUI();
    
    webApp.showAlert(`✅ Predicción guardada! +${puntosGanados} puntos`);
    
    // Cerrar modal
    document.getElementById('prediccionModal').classList.remove('active');
    renderMatches();
};

// Cerrar modal
document.querySelector('.modal-close').onclick = () => {
    document.getElementById('prediccionModal').classList.remove('active');
};

// Cargar ranking
async function loadRanking(tipo = 'global') {
    const container = document.getElementById('rankingList');
    container.innerHTML = '<div class="loading">Cargando ranking...</div>';
    
    try {
        let rankingRef;
        if (tipo === 'global') {
            rankingRef = database.ref('puntuaciones_globales');
        } else {
            // Ranking semanal (usando timestamp de la semana actual)
            rankingRef = database.ref('puntuaciones_semanales');
        }
        
        const snapshot = await rankingRef.once('value');
        const data = snapshot.val();
        
        if (!data) {
            container.innerHTML = '<div class="loading">Sin datos aún</div>';
            return;
        }
        
        const ranking = Object.entries(data)
            .filter(([_, value]) => value && typeof value.puntos === 'number')
            .map(([id, value]) => ({
                id: id,
                nombre: value.nombre || "Jugador",
                puntos: value.puntos || 0
            }))
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
        
    } catch (error) {
        console.error("Error loading ranking:", error);
        container.innerHTML = '<div class="loading">Error al cargar ranking</div>';
    }
}

// Invitar amigos
function shareInvite() {
    const inviteLink = `https://t.me/share/url?url=🏆 ¡Únete a Mundial Reto!&text=Predice los partidos del mundial, gana puntos y compite en el ranking global. Entra aquí: https://t.me/MundialRetoBot&hashtags=MundialReto`;
    webApp.openTelegramLink(inviteLink);
    
    // Simular invitado (en producción esto vendría de un parámetro)
    amigosInv++;
    userPoints += 2;
    saveUserData();
    updateUI();
    webApp.showAlert("👥 +2 puntos por invitar a un amigo!");
}

// Ver anuncio (simulado para AdsGram)
function watchAd() {
    // Aquí integrarás AdsGram
    // Por ahora damos puntos directos
    userPoints += 1;
    saveUserData();
    updateUI();
    webApp.showAlert("🎬 +1 punto por ver el anuncio!");
}

// Comprar powerup
async function buyPowerup(type) {
    const costs = { double: 10, shield: 8, hint: 5 };
    
    if (userPoints >= costs[type]) {
        userPoints -= costs[type];
        
        if (type === 'double') powerups.double = (powerups.double || 0) + 1;
        if (type === 'shield') powerups.shield = true;
        if (type === 'hint') powerups.hint = (powerups.hint || 0) + 1;
        
        await saveUserData();
        updateUI();
        webApp.showAlert(`⚡ ¡${type === 'double' ? 'Doble puntos' : type === 'shield' ? 'Seguro' : 'Pista'} comprado!`);
    } else {
        webApp.showAlert("❌ No tienes suficientes puntos");
    }
}

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    // Cargar datos del usuario
    await loadUserData();
    
    // Cargar partidos
    await loadMatches();
    
    // Cargar ranking inicial
    await loadRanking('global');
    
    // Configurar tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`tab-${tabId}`).classList.add('active');
            
            if (tabId === 'ranking') {
                const currentFilter = document.querySelector('.filter-btn.active')?.dataset.filter || 'global';
                loadRanking(currentFilter);
            }
        });
    });
    
    // Configurar filtros de ranking
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadRanking(btn.dataset.filter);
        });
    });
    
    // Configurar botones principales
    document.getElementById('btnInvitar')?.addEventListener('click', shareInvite);
    document.getElementById('btnAd')?.addEventListener('click', watchAd);
    document.getElementById('dailyReward')?.addEventListener('click', checkDailyReward);
    
    // Configurar compra de powerups
    document.querySelectorAll('.buy-powerup').forEach((btn, idx) => {
        const types = ['double', 'shield', 'hint'];
        btn.addEventListener('click', () => buyPowerup(types[idx]));
    });
});

console.log("✅ Mundial Reto - App inicializada correctamente");