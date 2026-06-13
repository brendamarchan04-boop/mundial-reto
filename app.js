// ============================================
// MUNDIAL RETO - VERSIÓN FINAL CORREGIDA
// Los puntos se asignan SOLO después de poner resultados
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
let predicciones = {};
let partidosActivos = [];
let powerups = { double: 0, shield: false };
let aciertosTotales = 0;
let aciertosExactos = 0;
let amigosInvitados = 0;

// Logros
let logros = {
    streak3: { id: "streak3", name: "🔥 En Rachas", desc: "3 aciertos seguidos", icon: "🔥", unlocked: false, puntos: 5 },
    profeta: { id: "profeta", name: "👑 Profeta", desc: "10 aciertos totales", icon: "👑", unlocked: false, puntos: 10 },
    influyente: { id: "influyente", name: "🤝 Influyente", desc: "Invitar 5 amigos", icon: "🤝", unlocked: false, puntos: 10 },
    perfecto: { id: "perfecto", name: "⭐ Perfecto", desc: "3 resultados exactos", icon: "⭐", unlocked: false, puntos: 15 },
    fiel: { id: "fiel", name: "📅 Fiel", desc: "7 días seguidos", icon: "📅", unlocked: false, puntos: 15 }
};

// ============================================
// CONVERSIÓN DE HORARIOS A HORA DE CUBA
// ============================================

function convertirHoraCuba(horaUSA) {
    const partes = horaUSA.split(' ');
    let hora = parseInt(partes[0].split(':')[0]);
    let minuto = parseInt(partes[0].split(':')[1]) || 0;
    let zona = partes[1] || 'ET';
    
    let horaCuba = hora;
    if (zona === 'CT') horaCuba = hora + 1;
    else if (zona === 'MT') horaCuba = hora + 2;
    else if (zona === 'PT') horaCuba = hora + 3;
    
    if (horaCuba >= 24) horaCuba -= 24;
    
    return `${horaCuba.toString().padStart(2, '0')}:${minuto.toString().padStart(2, '0')}`;
}

// ============================================
// BASE DE DATOS DE PARTIDOS (TODOS CON finalizado = false)
// ============================================

const TODOS_LOS_PARTIDOS = [
    { id: 1, local: "Catar", visita: "Suiza", fecha: "2026-06-13", horaUSA: "15:00 ET", finalizado: false, resultado: null },
    { id: 2, local: "Brasil", visita: "Marruecos", fecha: "2026-06-13", horaUSA: "18:00 ET", finalizado: false, resultado: null },
    { id: 3, local: "Haití", visita: "Escocia", fecha: "2026-06-13", horaUSA: "21:00 ET", finalizado: false, resultado: null },
    { id: 4, local: "Australia", visita: "Turquía", fecha: "2026-06-13", horaUSA: "00:00 ET", finalizado: false, resultado: null },
    { id: 5, local: "Alemania", visita: "Curazao", fecha: "2026-06-14", horaUSA: "13:00 CT", finalizado: false, resultado: null },
    { id: 6, local: "Países Bajos", visita: "Japón", fecha: "2026-06-14", horaUSA: "16:00 CT", finalizado: false, resultado: null },
    { id: 7, local: "Costa de Marfil", visita: "Ecuador", fecha: "2026-06-14", horaUSA: "19:00 CT", finalizado: false, resultado: null },
    { id: 8, local: "Suecia", visita: "Túnez", fecha: "2026-06-14", horaUSA: "22:00 CT", finalizado: false, resultado: null },
    { id: 9, local: "España", visita: "Cabo Verde", fecha: "2026-06-15", horaUSA: "12:00 ET", finalizado: false, resultado: null },
    { id: 10, local: "Bélgica", visita: "Egipto", fecha: "2026-06-15", horaUSA: "15:00 ET", finalizado: false, resultado: null },
    { id: 11, local: "Arabia Saudí", visita: "Uruguay", fecha: "2026-06-15", horaUSA: "18:00 ET", finalizado: false, resultado: null },
    { id: 12, local: "Irán", visita: "Nueva Zelanda", fecha: "2026-06-15", horaUSA: "21:00 ET", finalizado: false, resultado: null },
    { id: 13, local: "Francia", visita: "Senegal", fecha: "2026-06-16", horaUSA: "15:00 ET", finalizado: false, resultado: null },
    { id: 14, local: "Irak", visita: "Noruega", fecha: "2026-06-16", horaUSA: "18:00 ET", finalizado: false, resultado: null },
    { id: 15, local: "Argentina", visita: "Argelia", fecha: "2026-06-16", horaUSA: "21:00 ET", finalizado: false, resultado: null },
    { id: 16, local: "Austria", visita: "Jordania", fecha: "2026-06-16", horaUSA: "00:00 ET", finalizado: false, resultado: null },
    { id: 17, local: "Portugal", visita: "RD Congo", fecha: "2026-06-17", horaUSA: "13:00 CT", finalizado: false, resultado: null },
    { id: 18, local: "Inglaterra", visita: "Croacia", fecha: "2026-06-17", horaUSA: "16:00 CT", finalizado: false, resultado: null },
    { id: 19, local: "Ghana", visita: "Panamá", fecha: "2026-06-17", horaUSA: "19:00 CT", finalizado: false, resultado: null },
    { id: 20, local: "Uzbekistán", visita: "Colombia", fecha: "2026-06-17", horaUSA: "22:00 CT", finalizado: false, resultado: null },
    { id: 21, local: "República Checa", visita: "Sudáfrica", fecha: "2026-06-18", horaUSA: "12:00 ET", finalizado: false, resultado: null },
    { id: 22, local: "Suiza", visita: "Bosnia", fecha: "2026-06-18", horaUSA: "15:00 ET", finalizado: false, resultado: null },
    { id: 23, local: "Canadá", visita: "Catar", fecha: "2026-06-18", horaUSA: "18:00 ET", finalizado: false, resultado: null },
    { id: 24, local: "México", visita: "Corea del Sur", fecha: "2026-06-18", horaUSA: "21:00 ET", finalizado: false, resultado: null },
    { id: 25, local: "Estados Unidos", visita: "Australia", fecha: "2026-06-19", horaUSA: "15:00 CT", finalizado: false, resultado: null },
    { id: 26, local: "Escocia", visita: "Marruecos", fecha: "2026-06-19", horaUSA: "18:00 CT", finalizado: false, resultado: null },
    { id: 27, local: "Brasil", visita: "Haití", fecha: "2026-06-19", horaUSA: "21:00 CT", finalizado: false, resultado: null },
    { id: 28, local: "Turquía", visita: "Paraguay", fecha: "2026-06-19", horaUSA: "00:00 CT", finalizado: false, resultado: null },
    { id: 29, local: "Países Bajos", visita: "Suecia", fecha: "2026-06-20", horaUSA: "13:00 CT", finalizado: false, resultado: null },
    { id: 30, local: "Alemania", visita: "Costa de Marfil", fecha: "2026-06-20", horaUSA: "16:00 CT", finalizado: false, resultado: null },
    { id: 31, local: "Ecuador", visita: "Curazao", fecha: "2026-06-20", horaUSA: "22:00 CT", finalizado: false, resultado: null },
    { id: 32, local: "Túnez", visita: "Japón", fecha: "2026-06-20", horaUSA: "00:00 CT", finalizado: false, resultado: null },
    { id: 33, local: "España", visita: "Arabia Saudí", fecha: "2026-06-21", horaUSA: "12:00 ET", finalizado: false, resultado: null },
    { id: 34, local: "Bélgica", visita: "Irán", fecha: "2026-06-21", horaUSA: "15:00 ET", finalizado: false, resultado: null },
    { id: 35, local: "Uruguay", visita: "Cabo Verde", fecha: "2026-06-21", horaUSA: "18:00 ET", finalizado: false, resultado: null },
    { id: 36, local: "Nueva Zelanda", visita: "Egipto", fecha: "2026-06-21", horaUSA: "21:00 ET", finalizado: false, resultado: null },
    { id: 37, local: "Argentina", visita: "Austria", fecha: "2026-06-22", horaUSA: "13:00 CT", finalizado: false, resultado: null },
    { id: 38, local: "Francia", visita: "Irak", fecha: "2026-06-22", horaUSA: "17:00 CT", finalizado: false, resultado: null },
    { id: 39, local: "Noruega", visita: "Senegal", fecha: "2026-06-22", horaUSA: "20:00 CT", finalizado: false, resultado: null },
    { id: 40, local: "Jordania", visita: "Argelia", fecha: "2026-06-22", horaUSA: "23:00 CT", finalizado: false, resultado: null },
    { id: 41, local: "Portugal", visita: "Uzbekistán", fecha: "2026-06-23", horaUSA: "13:00 CT", finalizado: false, resultado: null },
    { id: 42, local: "Inglaterra", visita: "Ghana", fecha: "2026-06-23", horaUSA: "16:00 CT", finalizado: false, resultado: null },
    { id: 43, local: "Panamá", visita: "Croacia", fecha: "2026-06-23", horaUSA: "19:00 CT", finalizado: false, resultado: null },
    { id: 44, local: "Colombia", visita: "RD Congo", fecha: "2026-06-23", horaUSA: "22:00 CT", finalizado: false, resultado: null },
    { id: 45, local: "Suiza", visita: "Canadá", fecha: "2026-06-24", horaUSA: "15:00 PT", finalizado: false, resultado: null },
    { id: 46, local: "Bosnia", visita: "Catar", fecha: "2026-06-24", horaUSA: "15:00 PT", finalizado: false, resultado: null },
    { id: 47, local: "Escocia", visita: "Brasil", fecha: "2026-06-24", horaUSA: "18:00 PT", finalizado: false, resultado: null },
    { id: 48, local: "Marruecos", visita: "Haití", fecha: "2026-06-24", horaUSA: "18:00 PT", finalizado: false, resultado: null },
    { id: 49, local: "República Checa", visita: "México", fecha: "2026-06-24", horaUSA: "21:00 PT", finalizado: false, resultado: null },
    { id: 50, local: "Sudáfrica", visita: "Corea del Sur", fecha: "2026-06-24", horaUSA: "21:00 PT", finalizado: false, resultado: null },
    { id: 51, local: "Curazao", visita: "Costa de Marfil", fecha: "2026-06-25", horaUSA: "16:00 ET", finalizado: false, resultado: null },
    { id: 52, local: "Ecuador", visita: "Alemania", fecha: "2026-06-25", horaUSA: "16:00 ET", finalizado: false, resultado: null },
    { id: 53, local: "Japón", visita: "Suecia", fecha: "2026-06-25", horaUSA: "19:00 ET", finalizado: false, resultado: null },
    { id: 54, local: "Túnez", visita: "Países Bajos", fecha: "2026-06-25", horaUSA: "19:00 ET", finalizado: false, resultado: null },
    { id: 55, local: "Turquía", visita: "Estados Unidos", fecha: "2026-06-25", horaUSA: "22:00 ET", finalizado: false, resultado: null },
    { id: 56, local: "Paraguay", visita: "Australia", fecha: "2026-06-25", horaUSA: "22:00 ET", finalizado: false, resultado: null },
    { id: 57, local: "Noruega", visita: "Francia", fecha: "2026-06-26", horaUSA: "15:00 ET", finalizado: false, resultado: null },
    { id: 58, local: "Senegal", visita: "Irak", fecha: "2026-06-26", horaUSA: "15:00 ET", finalizado: false, resultado: null },
    { id: 59, local: "Cabo Verde", visita: "Arabia Saudí", fecha: "2026-06-26", horaUSA: "20:00 ET", finalizado: false, resultado: null },
    { id: 60, local: "Uruguay", visita: "España", fecha: "2026-06-26", horaUSA: "20:00 ET", finalizado: false, resultado: null },
    { id: 61, local: "Egipto", visita: "Irán", fecha: "2026-06-26", horaUSA: "23:00 ET", finalizado: false, resultado: null },
    { id: 62, local: "Nueva Zelanda", visita: "Bélgica", fecha: "2026-06-26", horaUSA: "23:00 ET", finalizado: false, resultado: null },
    { id: 63, local: "Panamá", visita: "Inglaterra", fecha: "2026-06-27", horaUSA: "17:00 ET", finalizado: false, resultado: null },
    { id: 64, local: "Croacia", visita: "Ghana", fecha: "2026-06-27", horaUSA: "17:00 ET", finalizado: false, resultado: null },
    { id: 65, local: "Colombia", visita: "Portugal", fecha: "2026-06-27", horaUSA: "19:30 ET", finalizado: false, resultado: null },
    { id: 66, local: "RD Congo", visita: "Uzbekistán", fecha: "2026-06-27", horaUSA: "19:30 ET", finalizado: false, resultado: null },
    { id: 67, local: "Argelia", visita: "Austria", fecha: "2026-06-27", horaUSA: "22:00 ET", finalizado: false, resultado: null },
    { id: 68, local: "Jordania", visita: "Argentina", fecha: "2026-06-27", horaUSA: "22:00 ET", finalizado: false, resultado: null }
];

// ============================================
// FUNCIONES DE PARTIDOS
// ============================================

function obtenerPartidosDelDia() {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const hoyStr = hoy.toISOString().split('T')[0];
    return TODOS_LOS_PARTIDOS.filter(p => p.fecha === hoyStr);
}

async function loadMatches() {
    const container = document.getElementById('partidosContainer');
    if (container) container.innerHTML = '<div class="loading">📡 Cargando partidos del día...</div>';
    
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const partidos = obtenerPartidosDelDia();
    partidosActivos = partidos.map(p => ({
        id: p.id,
        local: p.local,
        visita: p.visita,
        fecha: new Date(p.fecha).toLocaleDateString('es-ES', { month: 'numeric', day: 'numeric' }),
        hora: convertirHoraCuba(p.horaUSA),
        finalizado: p.finalizado,
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
        const estaFinalizado = partido.finalizado;
        
        // Mostrar botón de predecir SOLO si:
        // 1. El partido NO está finalizado
        // 2. El usuario NO ha hecho una predicción aún
        const mostrarBotonPredecir = !estaFinalizado && !yaPredicho;
        // Mostrar mensaje de espera si:
        // 1. El partido NO está finalizado
        // 2. El usuario YA hizo una predicción
        const mostrarMensajeEspera = !estaFinalizado && yaPredicho;
        // Mostrar resultado final si:
        // 1. El partido está finalizado
        const mostrarResultado = estaFinalizado;
        
        return `
            <div class="partido-card ${yaPredicho ? 'predicho' : ''} ${estaFinalizado ? 'finalizado' : ''}">
                <div class="partido-info">
                    <div class="equipos">
                        <span class="equipo-local">${partido.local}</span>
                        <span class="vs">VS</span>
                        <span class="equipo-visita">${partido.visita}</span>
                    </div>
                    <div class="hora-partido">${partido.fecha} - ${partido.hora} (hora Cuba)</div>
                </div>
                ${mostrarResultado ? 
                    `<div class="estado-partido finalizado">
                        ✅ Finalizado ${partido.resultadoReal ? '(' + partido.resultadoReal + ')' : ''}
                        ${yaPredicho && predicciones[partido.id]?.puntos_ganados > 0 ? 
                            `<div style="margin-top:5px;">🏆 +${predicciones[partido.id].puntos_ganados} puntos</div>` : 
                            yaPredicho ? `<div style="margin-top:5px;">❌ No acertaste</div>` : ''}
                    </div>` : 
                    mostrarMensajeEspera ?
                    `<div class="estado-partido">
                        ⏳ Esperando resultado...
                    </div>` :
                    `<button class="btn-predecir" data-id="${partido.id}">🔮 PREDECIR</button>`
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
// MODAL DE PREDICCIÓN (SOLO GUARDA, NO DA PUNTOS)
// ============================================

let partidoActual = null;
let resultadoSeleccionado = null;

function abrirModalPrediccion(partido) {
    partidoActual = partido;
    resultadoSeleccionado = null;
    
    const modal = document.getElementById('prediccionModal');
    if (!modal) return;
    
    document.getElementById('modalPartido').textContent = `${partido.local} vs ${partido.visita}`;
    modal.classList.add('active');
    
    document.querySelector('.goles-input').style.display = 'none';
    document.querySelectorAll('.opcion-btn').forEach(btn => btn.classList.remove('seleccionado'));
    document.querySelectorAll('.opcion-btn').forEach(btn => btn.style.background = 'rgba(255,255,255,0.1)');
    document.getElementById('golesLocal').value = '';
    document.getElementById('golesVisita').value = '';
}

document.querySelectorAll('.opcion-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.opcion-btn').forEach(b => {
            b.classList.remove('seleccionado');
            b.style.background = 'rgba(255,255,255,0.1)';
        });
        btn.classList.add('seleccionado');
        btn.style.background = '#2ecc71';
        
        resultadoSeleccionado = btn.dataset.resultado;
        document.querySelector('.goles-input').style.display = 'block';
    });
});

document.getElementById('confirmarExacto').onclick = async () => {
    if (!resultadoSeleccionado) {
        webApp.showAlert("❌ Selecciona un resultado primero (Local, Empate o Visita)");
        return;
    }
    
    const golesLocal = parseInt(document.getElementById('golesLocal').value) || 0;
    const golesVisita = parseInt(document.getElementById('golesVisita').value) || 0;
    
    if (golesLocal < 0 || golesVisita < 0) {
        webApp.showAlert("❌ Los goles no pueden ser negativos");
        return;
    }
    
    // Guardar predicción SIN dar puntos
    predicciones[partidoActual.id] = {
        prediccion: resultadoSeleccionado,
        goles_local: golesLocal,
        goles_visita: golesVisita,
        timestamp: Date.now(),
        puntos_ganados: 0,
        acertado: false
    };
    
    await saveUserData();
    updateUI();
    
    webApp.showAlert(`✅ ¡Predicción guardada! Recibirás puntos cuando el partido termine.`);
    document.getElementById('prediccionModal').classList.remove('active');
    resultadoSeleccionado = null;
    renderMatches();
};

document.querySelector('.modal-close')?.addEventListener('click', () => {
    document.getElementById('prediccionModal')?.classList.remove('active');
    resultadoSeleccionado = null;
});

// ============================================
// FUNCIÓN PARA ACTUALIZAR RESULTADOS (TÚ LA EJECUTAS)
// ============================================

async function actualizarResultadoPartido(partidoId, golesLocal, golesVisita) {
    // Buscar el partido en la lista
    const partido = TODOS_LOS_PARTIDOS.find(p => p.id === partidoId);
    if (!partido) {
        console.log("Partido no encontrado");
        return;
    }
    
    // Marcar como finalizado
    partido.finalizado = true;
    partido.resultado = `${golesLocal}-${golesVisita}`;
    
    // Obtener todos los usuarios
    const usuariosSnapshot = await database.ref('usuarios').once('value');
    const usuarios = usuariosSnapshot.val();
    
    let totalPuntosAsignados = 0;
    
    for (const [uid, usuario] of Object.entries(usuarios)) {
        const prediccion = usuario.predicciones?.[partidoId];
        if (!prediccion) continue;
        
        let puntosGanados = 0;
        let esExacto = false;
        
        // Calcular puntos según la predicción y el resultado real
        if (prediccion.prediccion === 'empate') {
            if (golesLocal === golesVisita) {
                if (golesLocal > 0 || golesVisita > 0) {
                    puntosGanados = 3;
                    esExacto = true;
                } else {
                    puntosGanados = 1;
                }
            } else {
                puntosGanados = 0;
            }
        } else if (prediccion.prediccion === 'local') {
            if (golesLocal > golesVisita) {
                if (prediccion.goles_local === golesLocal && prediccion.goles_visita === golesVisita) {
                    puntosGanados = 3;
                    esExacto = true;
                } else {
                    puntosGanados = 2;
                }
            } else {
                puntosGanados = 0;
            }
        } else if (prediccion.prediccion === 'visitante') {
            if (golesVisita > golesLocal) {
                if (prediccion.goles_local === golesLocal && prediccion.goles_visita === golesVisita) {
                    puntosGanados = 3;
                    esExacto = true;
                } else {
                    puntosGanados = 2;
                }
            } else {
                puntosGanados = 0;
            }
        }
        
        if (puntosGanados > 0) {
            // Actualizar puntos del usuario
            const nuevosPuntos = (usuario.puntos || 0) + puntosGanados;
            const nuevosPuntosSemana = (usuario.puntos_semana || 0) + puntosGanados;
            const nuevosAciertosTotales = (usuario.aciertos_totales || 0) + 1;
            const nuevosAciertosExactos = (usuario.aciertos_exactos || 0) + (esExacto ? 1 : 0);
            
            await database.ref(`usuarios/${uid}`).update({
                puntos: nuevosPuntos,
                puntos_semana: nuevosPuntosSemana,
                aciertos_totales: nuevosAciertosTotales,
                aciertos_exactos: nuevosAciertosExactos,
                [`predicciones/${partidoId}/puntos_ganados`]: puntosGanados,
                [`predicciones/${partidoId}/acertado`]: true
            });
            
            await database.ref(`puntuaciones_globales/${uid}`).update({
                puntos: nuevosPuntos
            });
            
            await database.ref(`puntuaciones_semanales/${uid}`).update({
                puntos: nuevosPuntosSemana
            });
            
            totalPuntosAsignados++;
        }
    }
    
    console.log(`✅ Partido ${partido.local} vs ${partido.visita}: ${golesLocal}-${golesVisita} | Puntos asignados a ${totalPuntosAsignados} usuarios`);
    
    // Actualizar la UI si estamos en la app
    if (typeof renderMatches === 'function') {
        // Recargar partidos para actualizar la vista
        const partidos = obtenerPartidosDelDia();
        partidosActivos = partidos.map(p => ({
            id: p.id,
            local: p.local,
            visita: p.visita,
            fecha: new Date(p.fecha).toLocaleDateString('es-ES', { month: 'numeric', day: 'numeric' }),
            hora: convertirHoraCuba(p.horaUSA),
            finalizado: p.finalizado,
            resultadoReal: p.resultado
        }));
        renderMatches();
    }
    
    return totalPuntosAsignados;
}

// ============================================
// FUNCIONES DE USUARIO Y FIREBASE
// ============================================

function getStartOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

function getWeekKey(date) {
    const start = getStartOfWeek(date);
    return `${start.getFullYear()}-${start.getMonth() + 1}-${start.getDate()}`;
}

async function loadUserData() {
    const snapshot = await database.ref(`usuarios/${userId}`).once('value');
    const data = snapshot.val();
    
    const today = new Date();
    const currentWeekKey = getWeekKey(today);
    
    if (data) {
        userPoints = data.puntos || 0;
        userStreak = data.racha || 0;
        lastLoginDate = data.ultimo_login || "";
        predicciones = data.predicciones || {};
        powerups = data.powerups || { double: 0, shield: false };
        aciertosTotales = data.aciertos_totales || 0;
        aciertosExactos = data.aciertos_exactos || 0;
        amigosInvitados = data.amigos_invitados || 0;
        
        if (data.logros) {
            for (const [id, unlocked] of Object.entries(data.logros)) {
                if (logros[id]) logros[id].unlocked = unlocked;
            }
        }
        
        const savedWeekKey = data.semana_key || "";
        const savedWeekPoints = data.puntos_semana || 0;
        
        if (savedWeekKey === currentWeekKey) {
            weekPoints = savedWeekPoints;
        } else {
            weekPoints = 0;
        }
        
        const todayStr = today.toDateString();
        if (lastLoginDate !== todayStr) {
            const bonus = Math.min(userStreak + 1, 7);
            const puntosBonus = bonus === 7 ? bonus + 5 : bonus;
            userPoints += puntosBonus;
            weekPoints += puntosBonus;
            userStreak++;
            lastLoginDate = todayStr;
            await saveUserData();
            webApp.showAlert(`🎁 Recompensa diaria: +${puntosBonus} puntos!`);
        }
    } else {
        userPoints = 10;
        weekPoints = 10;
        userStreak = 1;
        lastLoginDate = today.toDateString();
        predicciones = {};
        powerups = { double: 0, shield: false };
        aciertosTotales = 0;
        aciertosExactos = 0;
        amigosInvitados = 0;
        await saveUserData();
        webApp.showAlert("🎉 ¡Bienvenido! +10 puntos de regalo");
    }
    
    updateUI();
    verificarLogros();
    updateAchievementsUI();
}

async function saveUserData() {
    const today = new Date();
    const currentWeekKey = getWeekKey(today);
    
    const logrosGuardado = {};
    for (const [id, logro] of Object.entries(logros)) {
        logrosGuardado[id] = logro.unlocked;
    }
    
    await database.ref(`usuarios/${userId}`).set({
        nombre: userName,
        puntos: userPoints,
        puntos_semana: weekPoints,
        semana_key: currentWeekKey,
        racha: userStreak,
        ultimo_login: lastLoginDate,
        predicciones: predicciones,
        powerups: powerups,
        aciertos_totales: aciertosTotales,
        aciertos_exactos: aciertosExactos,
        amigos_invitados: amigosInvitados,
        logros: logrosGuardado
    });
    
    await database.ref(`puntuaciones_globales/${userId}`).set({
        nombre: userName,
        puntos: userPoints
    });
    
    await database.ref(`puntuaciones_semanales/${userId}`).set({
        nombre: userName,
        puntos: weekPoints,
        semana_key: currentWeekKey
    });
}

function updateUI() {
    document.getElementById('userName').textContent = userName;
    document.getElementById('userPoints').textContent = Math.floor(userPoints);
    document.getElementById('userStreak').innerHTML = `🔥 Racha: ${userStreak}`;
    document.getElementById('weekPoints').textContent = Math.floor(weekPoints);
    document.getElementById('totalAciertos').textContent = aciertosTotales;
    document.getElementById('exactos').textContent = aciertosExactos;
    document.getElementById('diasStreak').textContent = userStreak;
    
    let rank = "Novato";
    if (userPoints >= 351) rank = "Leyenda 🔴";
    else if (userPoints >= 201) rank = "Maestro 🟠";
    else if (userPoints >= 101) rank = "Experto 🟣";
    else if (userPoints >= 51) rank = "Analista 🔵";
    else if (userPoints >= 21) rank = "Aprendiz 🟢";
    document.getElementById('userRank').textContent = rank;
    
    const doubleCount = document.getElementById('doubleCount');
    if (doubleCount) doubleCount.textContent = powerups.double;
}

async function loadRanking() {
    const containerGlobal = document.getElementById('rankingGlobalList');
    const containerSemanal = document.getElementById('rankingSemanalList');
    
    if (containerGlobal) {
        containerGlobal.innerHTML = '<div class="loading">Cargando ranking global...</div>';
        const snapshotGlobal = await database.ref('puntuaciones_globales').once('value');
        const dataGlobal = snapshotGlobal.val();
        
        if (dataGlobal) {
            const rankingGlobal = Object.entries(dataGlobal)
                .map(([id, value]) => ({ nombre: value.nombre, puntos: value.puntos || 0 }))
                .sort((a, b) => b.puntos - a.puntos)
                .slice(0, 15);
            
            if (rankingGlobal.length > 0) {
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
                containerGlobal.innerHTML = '<div class="loading">Sin datos aún. ¡Sé el primero!</div>';
            }
        } else {
            containerGlobal.innerHTML = '<div class="loading">Sin datos aún. ¡Sé el primero!</div>';
        }
    }
    
    if (containerSemanal) {
        containerSemanal.innerHTML = '<div class="loading">Cargando ranking semanal...</div>';
        const snapshotSemanal = await database.ref('puntuaciones_semanales').once('value');
        const dataSemanal = snapshotSemanal.val();
        
        if (dataSemanal) {
            const rankingSemanal = Object.entries(dataSemanal)
                .map(([id, value]) => ({ nombre: value.nombre, puntos: value.puntos || 0 }))
                .sort((a, b) => b.puntos - a.puntos)
                .slice(0, 15);
            
            if (rankingSemanal.length > 0) {
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
                containerSemanal.innerHTML = '<div class="loading">Sin datos aún. ¡Sé el primero!</div>';
            }
        } else {
            containerSemanal.innerHTML = '<div class="loading">Sin datos aún. ¡Sé el primero!</div>';
        }
    }
}

// ============================================
// LOGROS
// ============================================

function verificarLogros() {
    let logroDesbloqueado = false;
    
    if (userStreak >= 3 && !logros.streak3.unlocked) {
        desbloquearLogro("streak3");
        logroDesbloqueado = true;
    }
    
    if (aciertosTotales >= 10 && !logros.profeta.unlocked) {
        desbloquearLogro("profeta");
        logroDesbloqueado = true;
    }
    
    if (aciertosExactos >= 3 && !logros.perfecto.unlocked) {
        desbloquearLogro("perfecto");
        logroDesbloqueado = true;
    }
    
    if (userStreak >= 7 && !logros.fiel.unlocked) {
        desbloquearLogro("fiel");
        logroDesbloqueado = true;
    }
    
    if (amigosInvitados >= 5 && !logros.influyente.unlocked) {
        desbloquearLogro("influyente");
        logroDesbloqueado = true;
    }
    
    if (logroDesbloqueado) {
        updateUI();
        updateAchievementsUI();
    }
}

function desbloquearLogro(id) {
    const logro = logros[id];
    if (!logro || logro.unlocked) return;
    
    logro.unlocked = true;
    userPoints += logro.puntos;
    weekPoints += logro.puntos;
    
    saveUserData();
    updateUI();
    webApp.showAlert(`🏅 ¡LOGRO DESBLOQUEADO! ${logro.name}\n+${logro.puntos} puntos extra`);
}

function updateAchievementsUI() {
    const container = document.getElementById('achievementsList');
    if (!container) return;
    
    container.innerHTML = Object.values(logros).map(logro => `
        <div class="achievement-item">
            <span class="achievement-icon">${logro.icon}</span>
            <div class="achievement-info">
                <div class="achievement-name">${logro.name}</div>
                <div class="achievement-desc">${logro.desc}</div>
            </div>
            <span class="achievement-status ${logro.unlocked ? 'unlocked' : 'locked'}">
                ${logro.unlocked ? '✅' : '🔒'}
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
        weekPoints -= costs[type];
        
        if (type === 'double') {
            powerups.double++;
            webApp.showAlert(`🔮 Comodín Doble Puntos comprado! Tienes ${powerups.double} disponible(s).`);
        }
        if (type === 'shield') {
            powerups.shield = true;
            webApp.showAlert(`🛡️ Comodín Seguro activado! No perderás tu racha si fallas.`);
        }
        
        await saveUserData();
        updateUI();
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
    amigosInvitados++;
    saveUserData();
    updateUI();
    verificarLogros();
    webApp.showAlert("👥 +2 puntos por invitar!");
}

// ============================================
// PANEL ADMIN (para actualizar resultados fácilmente)
// ============================================

function mostrarPanelAdmin() {
    // Tu ID de Telegram (cámbialo por el tuyo)
    const ADMIN_ID = "123456789"; // 🔴 CAMBIA ESTO POR TU ID REAL
    
    if (userId !== ADMIN_ID) return;
    
    const container = document.getElementById('partidosContainer');
    if (!container) return;
    
    const panelDiv = document.createElement('div');
    panelDiv.id = 'adminPanel';
    panelDiv.style.cssText = 'margin-top:20px; padding:15px; background:#1a1a3a; border-radius:15px; border:2px solid #ffd700;';
    
    panelDiv.innerHTML = `
        <h3 style="color:#ffd700; margin-bottom:10px;">🔧 PANEL ADMIN - Actualizar Resultados</h3>
        <div id="adminPartidosLista"></div>
    `;
    
    container.parentNode.insertBefore(panelDiv, container.nextSibling);
    cargarListaAdmin();
}

function cargarListaAdmin() {
    const container = document.getElementById('adminPartidosLista');
    if (!container) return;
    
    const partidosHoy = obtenerPartidosDelDia();
    
    if (partidosHoy.length === 0) {
        container.innerHTML = '<div style="color:#aaa;">No hay partidos hoy</div>';
        return;
    }
    
    container.innerHTML = partidosHoy.map(p => `
        <div style="margin-bottom:15px; padding:10px; background:#0a0a2a; border-radius:10px;">
            <div style="font-weight:bold; margin-bottom:8px;">${p.local} vs ${p.visita}</div>
            <div style="display:flex; gap:10px; align-items:center;">
                <input type="number" id="golLocal_${p.id}" placeholder="Goles Local" style="width:60px; padding:8px; border-radius:8px; border:none; text-align:center;">
                <span>-</span>
                <input type="number" id="golVisita_${p.id}" placeholder="Goles Visita" style="width:60px; padding:8px; border-radius:8px; border:none; text-align:center;">
                <button onclick="finalizarPartidoAdmin(${p.id})" style="background:#2ecc71; border:none; padding:8px 16px; border-radius:8px; color:white; font-weight:bold;">✅ Finalizar</button>
            </div>
            <div id="estadoAdmin_${p.id}" style="margin-top:5px; font-size:12px; color:#aaa;">${p.finalizado ? `Finalizado: ${p.resultado}` : 'Pendiente'}</div>
        </div>
    `).join('');
    
    // Exponer función global
    window.finalizarPartidoAdmin = async function(partidoId) {
        const golesLocal = parseInt(document.getElementById(`golLocal_${partidoId}`).value) || 0;
        const golesVisita = parseInt(document.getElementById(`golVisita_${partidoId}`).value) || 0;
        
        if (isNaN(golesLocal) || isNaN(golesVisita)) {
            webApp.showAlert("Ingresa los goles");
            return;
        }
        
        await actualizarResultadoPartido(partidoId, golesLocal, golesVisita);
        document.getElementById(`estadoAdmin_${partidoId}`).innerHTML = `✅ Finalizado: ${golesLocal}-${golesVisita}`;
        webApp.showAlert(`Resultado actualizado: ${golesLocal}-${golesVisita}`);
        
        // Recargar vista
        await loadMatches();
        cargarListaAdmin();
    };
}

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    await loadUserData();
    await loadMatches();
    await loadRanking();
    updateAchievementsUI();
    
    // Exponer función para consola
    window.actualizarResultadoPartido = actualizarResultadoPartido;
    
    // Mostrar panel admin si es administrador
    // 🔴 CAMBIA ESTE NÚMERO POR TU ID DE TELEGRAM 🔴
    const MI_ID = "TU_ID_AQUI"; // <--- PON AQUÍ TU ID DE TELEGRAM
    if (userId === MI_ID) {
        mostrarPanelAdmin();
        console.log("✅ Panel Admin activado");
    }
    
    // Configurar tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`tab-${tabId}`).classList.add('active');
            
            if (tabId === 'ranking') {
                const filter = document.querySelector('.filter-btn.active')?.dataset.filter || 'global';
                if (filter === 'global') {
                    document.getElementById('rankingGlobalList').style.display = 'block';
                    document.getElementById('rankingSemanalList').style.display = 'none';
                } else {
                    document.getElementById('rankingGlobalList').style.display = 'none';
                    document.getElementById('rankingSemanalList').style.display = 'block';
                }
                loadRanking();
            }
        });
    });
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const filter = btn.dataset.filter;
            if (filter === 'global') {
                document.getElementById('rankingGlobalList').style.display = 'block';
                document.getElementById('rankingSemanalList').style.display = 'none';
            } else {
                document.getElementById('rankingGlobalList').style.display = 'none';
                document.getElementById('rankingSemanalList').style.display = 'block';
            }
            loadRanking();
        });
    });
    
    document.getElementById('btnDouble')?.addEventListener('click', () => comprarPowerup('double'));
    document.getElementById('btnShield')?.addEventListener('click', () => comprarPowerup('shield'));
    document.getElementById('btnInvitar')?.addEventListener('click', shareInvite);
    
    document.getElementById('dailyReward')?.addEventListener('click', async () => {
        const today = new Date().toDateString();
        if (lastLoginDate !== today) {
            const bonus = Math.min(userStreak + 1, 7);
            const puntosBonus = bonus === 7 ? bonus + 5 : bonus;
            userPoints += puntosBonus;
            weekPoints += puntosBonus;
            userStreak++;
            lastLoginDate = today;
            await saveUserData();
            updateUI();
            webApp.showAlert(`🎁 Recompensa diaria: +${puntosBonus} puntos!`);
        } else {
            webApp.showAlert("Ya recibiste tu recompensa hoy. Vuelve mañana!");
        }
    });
    
    console.log("✅ Mundial Reto funcionando correctamente");
    console.log("📌 Para actualizar resultados desde consola: actualizarResultadoPartido(ID, golesLocal, golesVisita)");
});