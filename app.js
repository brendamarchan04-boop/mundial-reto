// ============================================
// MUNDIAL RETO - VERSIÓN COMPLETA
// Ranking semanal, logros y comodines funcionando
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
let weekPoints = 0;
let lastLoginDate = "";
let lastWeekReset = "";
let predicciones = {};
let partidosActivos = [];
let powerups = { double: 0, shield: false };

// Logros predefinidos
const ACHIEVEMENTS = {
    streak3: { id: "streak3", name: "🔥 En Rachas", desc: "3 aciertos seguidos", icon: "🔥", unlocked: false },
    profeta: { id: "profeta", name: "👑 Profeta", desc: "10 aciertos totales", icon: "👑", unlocked: false },
    influyente: { id: "influyente", name: "🤝 Influyente", desc: "Invitar 5 amigos", icon: "🤝", unlocked: false },
    perfecto: { id: "perfecto", name: "⭐ Perfecto", desc: "3 resultados exactos", icon: "⭐", unlocked: false },
    fiel: { id: "fiel", name: "📅 Fiel", desc: "7 días seguidos", icon: "📅", unlocked: false }
};

// ============================================
// BASE DE DATOS DE PARTIDOS
// ============================================

const TODOS_LOS_PARTIDOS = [
    // 13 DE JUNIO
    { id: 1, local: "Catar", visita: "Suiza", fecha: "2026-06-13", hora: "15:00", finalizado: false, resultado: null },
    { id: 2, local: "Brasil", visita: "Marruecos", fecha: "2026-06-13", hora: "18:00", finalizado: false, resultado: null },
    { id: 3, local: "Haití", visita: "Escocia", fecha: "2026-06-13", hora: "21:00", finalizado: false, resultado: null },
    { id: 4, local: "Australia", visita: "Turquía", fecha: "2026-06-13", hora: "00:00", finalizado: false, resultado: null },
    
    // 14 DE JUNIO
    { id: 5, local: "Alemania", visita: "Curazao", fecha: "2026-06-14", hora: "13:00", finalizado: false, resultado: null },
    { id: 6, local: "Países Bajos", visita: "Japón", fecha: "2026-06-14", hora: "16:00", finalizado: false, resultado: null },
    { id: 7, local: "Costa de Marfil", visita: "Ecuador", fecha: "2026-06-14", hora: "19:00", finalizado: false, resultado: null },
    { id: 8, local: "Suecia", visita: "Túnez", fecha: "2026-06-14", hora: "22:00", finalizado: false, resultado: null },
    
    // 15 DE JUNIO
    { id: 9, local: "España", visita: "Cabo Verde", fecha: "2026-06-15", hora: "12:00", finalizado: false, resultado: null },
    { id: 10, local: "Bélgica", visita: "Egipto", fecha: "2026-06-15", hora: "15:00", finalizado: false, resultado: null },
    { id: 11, local: "Arabia Saudí", visita: "Uruguay", fecha: "2026-06-15", hora: "18:00", finalizado: false, resultado: null },
    { id: 12, local: "Irán", visita: "Nueva Zelanda", fecha: "2026-06-15", hora: "21:00", finalizado: false, resultado: null },
    
    // 16 DE JUNIO
    { id: 13, local: "Francia", visita: "Senegal", fecha: "2026-06-16", hora: "15:00", finalizado: false, resultado: null },
    { id: 14, local: "Irak", visita: "Noruega", fecha: "2026-06-16", hora: "18:00", finalizado: false, resultado: null },
    { id: 15, local: "Argentina", visita: "Argelia", fecha: "2026-06-16", hora: "21:00", finalizado: false, resultado: null },
    { id: 16, local: "Austria", visita: "Jordania", fecha: "2026-06-16", hora: "00:00", finalizado: false, resultado: null },
    
    // 17 DE JUNIO
    { id: 17, local: "Portugal", visita: "RD Congo", fecha: "2026-06-17", hora: "13:00", finalizado: false, resultado: null },
    { id: 18, local: "Inglaterra", visita: "Croacia", fecha: "2026-06-17", hora: "16:00", finalizado: false, resultado: null },
    { id: 19, local: "Ghana", visita: "Panamá", fecha: "2026-06-17", hora: "19:00", finalizado: false, resultado: null },
    { id: 20, local: "Uzbekistán", visita: "Colombia", fecha: "2026-06-17", hora: "22:00", finalizado: false, resultado: null },
    
    // 18 DE JUNIO
    { id: 21, local: "República Checa", visita: "Sudáfrica", fecha: "2026-06-18", hora: "12:00", finalizado: false, resultado: null },
    { id: 22, local: "Suiza", visita: "Bosnia", fecha: "2026-06-18", hora: "15:00", finalizado: false, resultado: null },
    { id: 23, local: "Canadá", visita: "Catar", fecha: "2026-06-18", hora: "18:00", finalizado: false, resultado: null },
    { id: 24, local: "México", visita: "Corea del Sur", fecha: "2026-06-18", hora: "21:00", finalizado: false, resultado: null },
    
    // 19 DE JUNIO
    { id: 25, local: "Estados Unidos", visita: "Australia", fecha: "2026-06-19", hora: "15:00", finalizado: false, resultado: null },
    { id: 26, local: "Escocia", visita: "Marruecos", fecha: "2026-06-19", hora: "18:00", finalizado: false, resultado: null },
    { id: 27, local: "Brasil", visita: "Haití", fecha: "2026-06-19", hora: "21:00", finalizado: false, resultado: null },
    { id: 28, local: "Turquía", visita: "Paraguay", fecha: "2026-06-19", hora: "00:00", finalizado: false, resultado: null },
    
    // 20 DE JUNIO
    { id: 29, local: "Países Bajos", visita: "Suecia", fecha: "2026-06-20", hora: "13:00", finalizado: false, resultado: null },
    { id: 30, local: "Alemania", visita: "Costa de Marfil", fecha: "2026-06-20", hora: "16:00", finalizado: false, resultado: null },
    { id: 31, local: "Ecuador", visita: "Curazao", fecha: "2026-06-20", hora: "22:00", finalizado: false, resultado: null },
    { id: 32, local: "Túnez", visita: "Japón", fecha: "2026-06-20", hora: "00:00", finalizado: false, resultado: null },
    
    // 21 DE JUNIO
    { id: 33, local: "España", visita: "Arabia Saudí", fecha: "2026-06-21", hora: "12:00", finalizado: false, resultado: null },
    { id: 34, local: "Bélgica", visita: "Irán", fecha: "2026-06-21", hora: "15:00", finalizado: false, resultado: null },
    { id: 35, local: "Uruguay", visita: "Cabo Verde", fecha: "2026-06-21", hora: "18:00", finalizado: false, resultado: null },
    { id: 36, local: "Nueva Zelanda", visita: "Egipto", fecha: "2026-06-21", hora: "21:00", finalizado: false, resultado: null },
    
    // 22 DE JUNIO
    { id: 37, local: "Argentina", visita: "Austria", fecha: "2026-06-22", hora: "13:00", finalizado: false, resultado: null },
    { id: 38, local: "Francia", visita: "Irak", fecha: "2026-06-22", hora: "17:00", finalizado: false, resultado: null },
    { id: 39, local: "Noruega", visita: "Senegal", fecha: "2026-06-22", hora: "20:00", finalizado: false, resultado: null },
    { id: 40, local: "Jordania", visita: "Argelia", fecha: "2026-06-22", hora: "23:00", finalizado: false, resultado: null },
    
    // 23 DE JUNIO
    { id: 41, local: "Portugal", visita: "Uzbekistán", fecha: "2026-06-23", hora: "13:00", finalizado: false, resultado: null },
    { id: 42, local: "Inglaterra", visita: "Ghana", fecha: "2026-06-23", hora: "16:00", finalizado: false, resultado: null },
    { id: 43, local: "Panamá", visita: "Croacia", fecha: "2026-06-23", hora: "19:00", finalizado: false, resultado: null },
    { id: 44, local: "Colombia", visita: "RD Congo", fecha: "2026-06-23", hora: "22:00", finalizado: false, resultado: null },
    
    // 24 DE JUNIO
    { id: 45, local: "Suiza", visita: "Canadá", fecha: "2026-06-24", hora: "15:00", finalizado: false, resultado: null },
    { id: 46, local: "Bosnia", visita: "Catar", fecha: "2026-06-24", hora: "15:00", finalizado: false, resultado: null },
    { id: 47, local: "Escocia", visita: "Brasil", fecha: "2026-06-24", hora: "18:00", finalizado: false, resultado: null },
    { id: 48, local: "Marruecos", visita: "Haití", fecha: "2026-06-24", hora: "18:00", finalizado: false, resultado: null },
    { id: 49, local: "República Checa", visita: "México", fecha: "2026-06-24", hora: "21:00", finalizado: false, resultado: null },
    { id: 50, local: "Sudáfrica", visita: "Corea del Sur", fecha: "2026-06-24", hora: "21:00", finalizado: false, resultado: null },
    
    // 25 DE JUNIO
    { id: 51, local: "Curazao", visita: "Costa de Marfil", fecha: "2026-06-25", hora: "16:00", finalizado: false, resultado: null },
    { id: 52, local: "Ecuador", visita: "Alemania", fecha: "2026-06-25", hora: "16:00", finalizado: false, resultado: null },
    { id: 53, local: "Japón", visita: "Suecia", fecha: "2026-06-25", hora: "19:00", finalizado: false, resultado: null },
    { id: 54, local: "Túnez", visita: "Países Bajos", fecha: "2026-06-25", hora: "19:00", finalizado: false, resultado: null },
    { id: 55, local: "Turquía", visita: "Estados Unidos", fecha: "2026-06-25", hora: "22:00", finalizado: false, resultado: null },
    { id: 56, local: "Paraguay", visita: "Australia", fecha: "2026-06-25", hora: "22:00", finalizado: false, resultado: null },
    
    // 26 DE JUNIO
    { id: 57, local: "Noruega", visita: "Francia", fecha: "2026-06-26", hora: "15:00", finalizado: false, resultado: null },
    { id: 58, local: "Senegal", visita: "Irak", fecha: "2026-06-26", hora: "15:00", finalizado: false, resultado: null },
    { id: 59, local: "Cabo Verde", visita: "Arabia Saudí", fecha: "2026-06-26", hora: "20:00", finalizado: false, resultado: null },
    { id: 60, local: "Uruguay", visita: "España", fecha: "2026-06-26", hora: "20:00", finalizado: false, resultado: null },
    { id: 61, local: "Egipto", visita: "Irán", fecha: "2026-06-26", hora: "23:00", finalizado: false, resultado: null },
    { id: 62, local: "Nueva Zelanda", visita: "Bélgica", fecha: "2026-06-26", hora: "23:00", finalizado: false, resultado: null },
    
    // 27 DE JUNIO
    { id: 63, local: "Panamá", visita: "Inglaterra", fecha: "2026-06-27", hora: "17:00", finalizado: false, resultado: null },
    { id: 64, local: "Croacia", visita: "Ghana", fecha: "2026-06-27", hora: "17:00", finalizado: false, resultado: null },
    { id: 65, local: "Colombia", visita: "Portugal", fecha: "2026-06-27", hora: "19:30", finalizado: false, resultado: null },
    { id: 66, local: "RD Congo", visita: "Uzbekistán", fecha: "2026-06-27", hora: "19:30", finalizado: false, resultado: null },
    { id: 67, local: "Argelia", visita: "Austria", fecha: "2026-06-27", hora: "22:00", finalizado: false, resultado: null },
    { id: 68, local: "Jordania", visita: "Argentina", fecha: "2026-06-27", hora: "22:00", finalizado: false, resultado: null }
];

// ============================================
// FUNCIONES DE PARTIDOS
// ============================================

function obtenerPartidosDelDia() {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const hoyStr = hoy.toISOString().split('T')[0];
    
    const partidosHoy = TODOS_LOS_PARTIDOS.filter(p => p.fecha === hoyStr);
    const partidosAnteriores = TODOS_LOS_PARTIDOS.filter(p => 
        p.fecha < hoyStr && !predicciones[p.id]
    );
    
    return [...partidosHoy, ...partidosAnteriores];
}

async function loadMatches() {
    const container = document.getElementById('partidosContainer');
    if (container) {
        container.innerHTML = '<div class="loading">📡 Cargando partidos...</div>';
    }
    
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const partidos = obtenerPartidosDelDia();
    partidosActivos = partidos.map(p => ({
        id: p.id,
        local: p.local,
        visita: p.visita,
        fecha: new Date(p.fecha).toLocaleDateString('es-ES', { month: 'numeric', day: 'numeric' }),
        hora: p.hora,
        status: p.finalizado ? "FINISHED" : "SCHEDULED",
        resultadoReal: p.resultado
    }));
    
    renderMatches();
}

function renderMatches() {
    const container = document.getElementById('partidosContainer');
    if (!container) return;
    
    if (partidosActivos.length === 0) {
        container.innerHTML = '<div class="loading">📭 No hay partidos programados para hoy</div>';
        return;
    }
    
    container.innerHTML = partidosActivos.map(partido => {
        const yaPredicho = predicciones[partido.id];
        const estaFinalizado = partido.status === 'FINISHED';
        
        return `
            <div class="partido-card ${yaPredicho ? 'predicho' : ''} ${estaFinalizado ? 'cerrado' : ''}">
                <div class="partido-info">
                    <div class="equipos">
                        <span class="equipo-local">${partido.local}</span>
                        <span class="vs">VS</span>
                        <span class="equipo-visita">${partido.visita}</span>
                    </div>
                    <div class="hora-partido">${partido.fecha} - ${partido.hora}</div>
                </div>
                <div class="estado-partido ${estaFinalizado ? 'finalizado' : ''}">
                    ${estaFinalizado ? `✅ Finalizado ${partido.resultadoReal ? '(' + partido.resultadoReal + ')' : ''}` : '📅 Pendiente'}
                </div>
                ${!estaFinalizado && !yaPredicho ? 
                    `<button class="btn-predecir" data-id="${partido.id}">🔮 PREDECIR</button>` : 
                    yaPredicho ? `<div style="text-align:center; margin-top:8px;">✅ +${yaPredicho.puntos_ganados || 0} pts</div>` : ''
                }
            </div>
        `;
    }).join('');
    
    document.querySelectorAll('.btn-predecir').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const partidoId = parseInt(btn.dataset.id);
            const partido = partidosActivos.find(p => p.id === partidoId);
            if (partido) abrirModalPrediccion(partido);
        });
    });
}

// ============================================
// MODAL DE PREDICCIÓN
// ============================================

let partidoActual = null;

function abrirModalPrediccion(partido) {
    partidoActual = partido;
    const modal = document.getElementById('prediccionModal');
    if (!modal) return;
    
    document.getElementById('modalPartido').textContent = `${partido.local} vs ${partido.visita}`;
    modal.classList.add('active');
    
    document.querySelector('.goles-input').style.display = 'none';
    document.querySelectorAll('.opcion-btn').forEach(btn => btn.style.background = 'rgba(255,255,255,0.1)');
    document.getElementById('golesLocal').value = '';
    document.getElementById('golesVisita').value = '';
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
    let golesLocal = 0;
    let golesVisita = 0;
    let esExacto = false;
    
    if (resultado !== 'empate') {
        golesLocal = parseInt(document.getElementById('golesLocal').value) || 0;
        golesVisita = parseInt(document.getElementById('golesVisita').value) || 0;
        
        if (resultado === 'local' && golesLocal > golesVisita) {
            puntosGanados = 3;
            esExacto = true;
        } else if (resultado === 'visitante' && golesVisita > golesLocal) {
            puntosGanados = 3;
            esExacto = true;
        } else {
            puntosGanados = 2;
        }
    }
    
    // Aplicar comodín de doble puntos si está activo
    if (powerups.double > 0) {
        puntosGanados *= 2;
        powerups.double--;
        webApp.showAlert(`🔮 ¡COMODÍN ACTIVADO! Puntos duplicados: +${puntosGanados}`);
    }
    
    predicciones[partidoActual.id] = {
        prediccion: resultado,
        goles_local: golesLocal,
        goles_visita: golesVisita,
        timestamp: Date.now(),
        puntos_ganados: puntosGanados,
        exacto: esExacto
    };
    
    userPoints += puntosGanados;
    weekPoints += puntosGanados;
    
    await saveUserData();
    updateUI();
    verificarLogros();
    
    webApp.showAlert(`✅ +${puntosGanados} puntos!`);
    document.getElementById('prediccionModal').classList.remove('active');
    renderMatches();
    await loadRanking();
};

document.querySelector('.modal-close')?.addEventListener('click', () => {
    document.getElementById('prediccionModal')?.classList.remove('active');
});

// ============================================
// FUNCIONES DE USUARIO Y FIREBASE
// ============================================

async function loadUserData() {
    const snapshot = await database.ref(`usuarios/${userId}`).once('value');
    const data = snapshot.val();
    
    if (data) {
        userPoints = data.puntos || 0;
        weekPoints = data.puntos_semana || 0;
        userStreak = data.racha || 0;
        lastLoginDate = data.ultimo_login || "";
        lastWeekReset = data.ultimo_reset_semana || "";
        predicciones = data.predicciones || {};
        powerups = data.powerups || { double: 0, shield: false };
        
        // Verificar si hay que resetear la semana
        const today = new Date();
        const startOfWeek = getStartOfWeek(today);
        if (lastWeekReset !== startOfWeek.toISOString()) {
            weekPoints = 0;
            lastWeekReset = startOfWeek.toISOString();
            await saveUserData();
        }
        
        // Verificar racha de login
        const todayStr = today.toDateString();
        if (lastLoginDate !== todayStr) {
            const bonus = Math.min(userStreak + 1, 7);
            userPoints += bonus === 7 ? bonus + 5 : bonus;
            weekPoints += bonus === 7 ? bonus + 5 : bonus;
            userStreak++;
            lastLoginDate = todayStr;
            await saveUserData();
            webApp.showAlert(`🎁 Recompensa diaria: +${bonus === 7 ? bonus + 5 : bonus} puntos!`);
        }
    } else {
        userPoints = 10;
        weekPoints = 10;
        userStreak = 1;
        lastLoginDate = new Date().toDateString();
        lastWeekReset = getStartOfWeek(new Date()).toISOString();
        predicciones = {};
        powerups = { double: 0, shield: false };
        await saveUserData();
        webApp.showAlert("🎉 ¡Bienvenido! +10 puntos de regalo");
    }
    
    updateUI();
    verificarLogros();
}

function getStartOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

async function saveUserData() {
    await database.ref(`usuarios/${userId}`).set({
        nombre: userName,
        puntos: userPoints,
        puntos_semana: weekPoints,
        racha: userStreak,
        ultimo_login: lastLoginDate,
        ultimo_reset_semana: lastWeekReset,
        predicciones: predicciones,
        powerups: powerups
    });
    
    await database.ref(`puntuaciones_globales/${userId}`).set({
        nombre: userName,
        puntos: userPoints
    });
    
    await database.ref(`puntuaciones_semanales/${userId}`).set({
        nombre: userName,
        puntos: weekPoints
    });
}

function updateUI() {
    document.getElementById('userName').textContent = userName;
    document.getElementById('userPoints').textContent = Math.floor(userPoints);
    document.getElementById('userStreak').innerHTML = `🔥 Racha: ${userStreak}`;
    document.getElementById('weekPoints').textContent = Math.floor(weekPoints);
    
    let rank = "Novato";
    if (userPoints >= 351) rank = "Leyenda 🔴";
    else if (userPoints >= 201) rank = "Maestro 🟠";
    else if (userPoints >= 101) rank = "Experto 🟣";
    else if (userPoints >= 51) rank = "Analista 🔵";
    else if (userPoints >= 21) rank = "Aprendiz 🟢";
    document.getElementById('userRank').textContent = rank;
    
    // Actualizar contador de comodines
    document.getElementById('doubleCount').textContent = powerups.double;
}

async function loadRanking() {
    const containerGlobal = document.getElementById('rankingGlobalList');
    const containerSemanal = document.getElementById('rankingSemanalList');
    
    // Ranking Global
    if (containerGlobal) {
        containerGlobal.innerHTML = '<div class="loading">Cargando...</div>';
        const snapshotGlobal = await database.ref('puntuaciones_globales').once('value');
        const dataGlobal = snapshotGlobal.val();
        
        if (dataGlobal) {
            const rankingGlobal = Object.entries(dataGlobal)
                .map(([id, value]) => ({ nombre: value.nombre, puntos: value.puntos || 0 }))
                .sort((a, b) => b.puntos - a.puntos)
                .slice(0, 15);
            
            containerGlobal.innerHTML = rankingGlobal.map((user, i) => `
                <div class="ranking-item">
                    <div class="ranking-pos ${i === 0 ? 'top1' : i === 1 ? 'top2' : i === 2 ? 'top3' : ''}">
                        ${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i+1}
                    </div>
                    <div class="ranking-name">${user.nombre}</div>
                    <div class="ranking-points">${Math.floor(user.puntos)} pts</div>
                </div>
            `).join('');
        } else {
            containerGlobal.innerHTML = '<div class="loading">Sin datos aún</div>';
        }
    }
    
    // Ranking Semanal
    if (containerSemanal) {
        containerSemanal.innerHTML = '<div class="loading">Cargando...</div>';
        const snapshotSemanal = await database.ref('puntuaciones_semanales').once('value');
        const dataSemanal = snapshotSemanal.val();
        
        if (dataSemanal) {
            const rankingSemanal = Object.entries(dataSemanal)
                .map(([id, value]) => ({ nombre: value.nombre, puntos: value.puntos || 0 }))
                .sort((a, b) => b.puntos - a.puntos)
                .slice(0, 15);
            
            containerSemanal.innerHTML = rankingSemanal.map((user, i) => `
                <div class="ranking-item">
                    <div class="ranking-pos ${i === 0 ? 'top1' : i === 1 ? 'top2' : i === 2 ? 'top3' : ''}">
                        ${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i+1}
                    </div>
                    <div class="ranking-name">${user.nombre}</div>
                    <div class="ranking-points">${Math.floor(user.puntos)} pts</div>
                </div>
            `).join('');
        } else {
            containerSemanal.innerHTML = '<div class="loading">Sin datos aún</div>';
        }
    }
}

// ============================================
// LOGROS
// ============================================

function verificarLogros() {
    const aciertosTotales = Object.keys(predicciones).length;
    const aciertosExactos = Object.values(predicciones).filter(p => p.exacto === true).length;
    const rachaActual = userStreak;
    
    // Verificar cada logro
    if (rachaActual >= 3 && !ACHIEVEMENTS.streak3.unlocked) {
        desbloquearLogro("streak3", "🔥 En Rachas", "+5 puntos por racha de 3!");
    }
    if (aciertosTotales >= 10 && !ACHIEVEMENTS.profeta.unlocked) {
        desbloquearLogro("profeta", "👑 Profeta", "+10 puntos por 10 aciertos!");
    }
    if (aciertosExactos >= 3 && !ACHIEVEMENTS.perfecto.unlocked) {
        desbloquearLogro("perfecto", "⭐ Perfecto", "+15 puntos por 3 resultados exactos!");
    }
    if (rachaActual >= 7 && !ACHIEVEMENTS.fiel.unlocked) {
        desbloquearLogro("fiel", "📅 Fiel", "+15 puntos por 7 días seguidos!");
    }
    
    updateAchievementsUI();
}

function desbloquearLogro(id, nombre, mensaje) {
    ACHIEVEMENTS[id].unlocked = true;
    
    // Dar puntos extra por desbloquear logro
    const puntosExtra = { streak3: 5, profeta: 10, perfecto: 15, fiel: 15, influyente: 10 };
    const extra = puntosExtra[id] || 5;
    userPoints += extra;
    weekPoints += extra;
    saveUserData();
    updateUI();
    
    webApp.showAlert(`🏅 ¡LOGRO DESBLOQUEADO! ${nombre}\n${mensaje} +${extra} puntos`);
}

function updateAchievementsUI() {
    const container = document.getElementById('achievementsList');
    if (!container) return;
    
    container.innerHTML = Object.values(ACHIEVEMENTS).map(ach => `
        <div class="achievement-item">
            <span class="achievement-icon">${ach.icon}</span>
            <div class="achievement-info">
                <div class="achievement-name">${ach.name}</div>
                <div class="achievement-desc">${ach.desc}</div>
            </div>
            <span class="achievement-status ${ach.unlocked ? 'unlocked' : 'locked'}">
                ${ach.unlocked ? '✅' : '🔒'}
            </span>
        </div>
    `).join('');
}

// ============================================
// COMODINES
// ============================================

async function comprarPowerup(type) {
    const costs = { double: 10, shield: 8 };
    
    if (userPoints >= costs[type]) {
        userPoints -= costs[type];
        
        if (type === 'double') {
            powerups.double++;
        }
        if (type === 'shield') {
            powerups.shield = true;
            webApp.showAlert(`🛡️ Comodín Seguro activado! No perderás tu racha si fallas.`);
        }
        
        await saveUserData();
        updateUI();
        webApp.showAlert(`⚡ ¡${type === 'double' ? 'Comodín Doble Puntos' : 'Comodín Seguro'} comprado!`);
    } else {
        webApp.showAlert(`❌ Necesitas ${costs[type]} puntos para este comodín`);
    }
}

// ============================================
// INVITAR AMIGOS
// ============================================

function shareInvite() {
    const inviteLink = `https://t.me/share/url?url=🏆 Mundial Reto&text=¡Predice los partidos del mundial y gana puntos! https://t.me/MundialRetoBot`;
    webApp.openTelegramLink(inviteLink);
    userPoints += 2;
    weekPoints += 2;
    saveUserData();
    updateUI();
    webApp.showAlert("👥 +2 puntos por invitar!");
    
    // Verificar logro de influyente (5 invitados)
    // En producción se contaría desde Firebase, por ahora es manual
}

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    await loadUserData();
    await loadMatches();
    await loadRanking();
    updateAchievementsUI();
    
    // Configurar tabs
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
    
    // Botones
    document.getElementById('btnInvitar')?.addEventListener('click', shareInvite);
    document.getElementById('btnDouble')?.addEventListener('click', () => comprarPowerup('double'));
    document.getElementById('btnShield')?.addEventListener('click', () => comprarPowerup('shield'));
    
    // Recompensa diaria manual
    document.getElementById('dailyReward')?.addEventListener('click', async () => {
        const today = new Date().toDateString();
        if (lastLoginDate !== today) {
            const bonus = Math.min(userStreak + 1, 7);
            userPoints += bonus === 7 ? bonus + 5 : bonus;
            weekPoints += bonus === 7 ? bonus + 5 : bonus;
            userStreak++;
            lastLoginDate = today;
            await saveUserData();
            updateUI();
            webApp.showAlert(`🎁 Recompensa diaria: +${bonus === 7 ? bonus + 5 : bonus} puntos!`);
        } else {
            webApp.showAlert("Ya recibiste tu recompensa hoy. Vuelve mañana!");
        }
    });
    
    console.log("✅ Mundial Reto funcionando con ranking semanal, logros y comodines");
});