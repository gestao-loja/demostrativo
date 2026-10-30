window.onload = function() {
    var dimensionsDiv = document.getElementById('dimensions');
    if (dimensionsDiv) {
        dimensionsDiv.innerHTML = 'Width: ' + window.innerWidth + 'px, Height: ' + window.innerHeight + 'px';
    }
    // Atualiza as variáveis CSS com as dimensões da tela
    document.documentElement.style.setProperty('--screen-width', window.innerWidth + 'px');
    document.documentElement.style.setProperty('--screen-height', window.innerHeight + 'px');
}

// Função genérica para abrir modais (evita repetição de código)
function configurarModalFechar(idModal, classeAbrir) {
    const modal = document.getElementById(idModal);
    if (!modal) return;

    // Remove o evento antigo para não duplicar caso a função seja chamada várias vezes
    modal.onclick = null; 
    
    modal.onclick = function(e) {
        if (e.target.id === idModal || e.target.classList.contains('fechar')) {
            modal.classList.remove(classeAbrir);
        }
    };
}

function abrirModal() {
    const modal = document.getElementById('janela-modal');
    if (!modal) return;
    modal.classList.add('abrir');
    configurarModalFechar('janela-modal', 'abrir');
}

function abrirModal1() {
    const modal = document.getElementById('janela-modal1');
    if (!modal) return;
    modal.classList.add('abrir1');
    configurarModalFechar('janela-modal1', 'abrir1');
}

function abrirModal2() {
    const modal = document.getElementById('janela-modal2');
    if (!modal) return;
    modal.classList.add('abrir2');
    configurarModalFechar('janela-modal2', 'abrir2');
}

function abrirModal3() {
    const modal = document.getElementById('janela-modal3');
    if (!modal) return;
    modal.classList.add('abrir3');
    configurarModalFechar('janela-modal3', 'abrir3');
}

function abrirModal4() {
    const modal = document.getElementById('janela-modal4');
    if (!modal) return;
    modal.classList.add('abrir4');
    configurarModalFechar('janela-modal4', 'abrir4');
}

function abrirModal5() {
    const modal = document.getElementById('janela-modal5');
    if (!modal) return;
    modal.classList.add('abrir5');
    configurarModalFechar('janela-modal5', 'abrir5');
}

function abrirModal6() {
    const modal = document.getElementById('janela-modal6');
    if (!modal) return;
    modal.classList.add('abrir6');
    configurarModalFechar('janela-modal6', 'abrir6');
}

function abrirModal7() {
    const modal = document.getElementById('janela-modal7');
    if (!modal) return;
    modal.classList.add('abrir7');
    configurarModalFechar('janela-modal7', 'abrir7');
}

function abrirModal8() {
    const modal = document.getElementById('janela-modal8');
    if (!modal) return;
    modal.classList.add('abrir8');
    configurarModalFechar('janela-modal8', 'abrir8');
}

function abrirModal9() {
    const modal = document.getElementById('janela-modal9');
    if (!modal) return;
    modal.classList.add('abrir9');
    configurarModalFechar('janela-modal9', 'abrir9');
}

function abrir1Modal() {
    const modal = document.getElementById('janela-modal10');
    if (!modal) return;
    modal.classList.add('abrir10');
    configurarModalFechar('janela-modal10', 'abrir10');
}

function abrir2Modal() {
    const modal = document.getElementById('janela-modal11');
    if (!modal) return;
    modal.classList.add('abrir11');
    configurarModalFechar('janela-modal11', 'abrir11');
}

function abrir3Modal() {
    const modal = document.getElementById('janela-modal12');
    if (!modal) return;
    modal.classList.add('abrir12');
    configurarModalFechar('janela-modal12', 'abrir12');
}

function abrir4Modal() {
    const modal = document.getElementById('janela-modal13');
    if (!modal) return;
    modal.classList.add('abrir13');
    configurarModalFechar('janela-modal13', 'abrir13');
}

function abrir5Modal() {
    const modal = document.getElementById('janela-modal14');
    if (!modal) return;
    modal.classList.add('abrir14');
    configurarModalFechar('janela-modal14', 'abrir14');
}

function abrir6Modal() {
    const modal = document.getElementById('janela-modal15');
    if (!modal) return;
    modal.classList.add('abrir15');
    configurarModalFechar('janela-modal15', 'abrir15');
}

function abrir7Modal() {
    const modal = document.getElementById('janela-modal16');
    if (!modal) return;
    modal.classList.add('abrir16');
    configurarModalFechar('janela-modal16', 'abrir16');
}

function abrir8Modal() {
    const modal = document.getElementById('janela-modal17');
    if (!modal) return;
    modal.classList.add('abrir17');
    configurarModalFechar('janela-modal17', 'abrir17');
}

function abrir9Modal() {
    const modal = document.getElementById('janela-modal18');
    if (!modal) return;
    modal.classList.add('abrir18');
    configurarModalFechar('janela-modal18', 'abrir18');
}

function abrir10Modal() {
    const modal = document.getElementById('janela-modal19');
    if (!modal) return;
    modal.classList.add('abrir19');
    configurarModalFechar('janela-modal19', 'abrir19');
}

function abrir11Modal() {
    const modal = document.getElementById('janela-modal20');
    if (!modal) return;
    modal.classList.add('abrir20');
    configurarModalFechar('janela-modal20', 'abrir20');
}