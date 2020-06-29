var socket = io();

var connected = false;
var isAdmin = false;
var latency = -1;

function updateLogin(hideLogin) {
    if (hideLogin) {
        document.getElementById('login').style.display = "none"
        document.getElementById('main').style.display = "block"
    } else {
        document.getElementById('login').style.display = "block"
        document.getElementById('main').style.display = "none"
    }
}

socket.on('connect', () => {
    connected = true;
    
    document.getElementById('connection-status').innerText = "ONLINE [CLIENT]"
    document.getElementById('connection-status-color').style.backgroundColor = "#00ff00"
})

socket.on('disconnect', () => {
    connected = false;
    isAdmin = false;
    latency = -1

    document.getElementById('connection-status').innerText = "OFFLINE"
    document.getElementById('connection-status-color').style.backgroundColor = "#ff0000"
    document.getElementById('connection-latency').innerText = ""

    let flag = document.getElementById('login').style.display === "none"

    setTimeout(() => {
        if (flag) alert('Conexão com servidor perdida')
    }, 50)

    updateLogin(false)
})

socket.on('pong', function(ms) {
    latency = ms;
    document.getElementById('connection-latency').innerText = latency.toString() + "ms";
});

let loginForm = document.getElementById('token-form');
loginForm.addEventListener("submit", event => {
    event.preventDefault()

    if (!connected)  {
        alert('Servidor está offline')
        return
    }

    socket.emit('login_as_admin', loginForm.token.value.toUpperCase(), status => {
        isAdmin = status;

        if (isAdmin === true) {
            document.getElementById('connection-status').innerText = "ONLINE [ADMIN]"
            updateLogin(true)
            loadMainPage()
        } else {
            alert('Token incorreto')
        }
    })
})

let ALL_PLAYERS = []
function updatePlayers(p) {
    let template = document.getElementById('player-template')
    let parent = document.getElementById('main-players-parent')

    document.getElementById('add-match-winner').innerHTML = '';
    document.getElementById('add-match-loser').innerHTML = '';

    parent.innerHTML = '';

    ALL_PLAYERS = p;

    ALL_PLAYERS.sort((a, b) => a.name < b.name ? -1 : 1);

    ALL_PLAYERS.forEach((player, i) => {
        let clone = template.content.cloneNode(true);

        clone.querySelector('span').innerText = (i + 1).toString() + "."
        clone.querySelector('input').id = 'player-input-nome' + (i + 1).toString()
        clone.querySelector('input').value = player.name
        clone.querySelector('input').addEventListener('input', () => {
            if (document.getElementById('player-input-nome' + (i + 1).toString()).value === player.name) {
                document.getElementById('player-button-salvar' + (i + 1).toString()).disabled = true;
            } else {
                document.getElementById('player-button-salvar' + (i + 1).toString()).disabled = false;
            }
        });
        clone.querySelectorAll('button')[0].id = 'player-button-salvar' + (i + 1).toString()
        clone.querySelectorAll('button')[0].disabled = true;
        clone.querySelectorAll('button')[0].addEventListener('click', () => {
            let name = document.getElementById('player-input-nome' + (i + 1).toString()).value

            if (name.length < 1) { setTimeout(() => {alert('Nome de jogador precisa ter pelo menos 1 char')}, 50); return; }

            for (let i = 0; i < ALL_PLAYERS.length; i++) {
                if (ALL_PLAYERS[i].name === name) {
                    setTimeout(() => {alert('Nome de jogador precisa ser único')}, 50);
                    return;
                }
            }

            for (let i = 0; i < ALL_MATCHES.length; i++) {
                if (ALL_MATCHES[i].winner === player.name) {
                    ALL_MATCHES[i].winner = name
                }
                if (ALL_MATCHES[i].loser === player.name) {
                    ALL_MATCHES[i].loser = name
                }
            }

            let oldName = player.name;
            player.name = name;
            updatePlayers(ALL_PLAYERS)
            updateMatches(ALL_MATCHES)
            socket.emit('update_player', oldName, name)
        })
        clone.querySelectorAll('button')[1].addEventListener('click', () => {
            if (!confirm("Você tem certeza que deseja remover?")) { return }

            for (let i = 0; i < ALL_PLAYERS.length; i++) {
                if (ALL_PLAYERS[i].name === player.name) {
                    ALL_PLAYERS.splice(i, 1);
                    break;
                }
            }

            for (let i = 0; i < ALL_MATCHES.length; i++) {
                if (ALL_MATCHES[i].winner === player.name || ALL_MATCHES[i].loser === player.name) {
                    ALL_MATCHES.splice(i, 1);
                    --i;
                }
            }
            updatePlayers(ALL_PLAYERS)
            updateMatches(ALL_MATCHES)
            socket.emit('delete_player', player.name)
        })

        let winnerOpt = document.createElement('option');
        let loserOpt = document.createElement('option');

        winnerOpt.value = loserOpt.value = player.name;
        winnerOpt.innerText = loserOpt.innerText = player.name;

        document.getElementById('add-match-winner').appendChild(winnerOpt);
        document.getElementById('add-match-loser').appendChild(loserOpt);

        parent.appendChild(clone)
    })
}

let ALL_MATCHES = []
function updateMatches(m) {
    let template = document.getElementById('match-template')
    let parent = document.getElementById('main-matches-parent')

    ALL_MATCHES = m;

    ALL_MATCHES.sort((a, b) => b.timestamp - a.timestamp)

    parent.innerHTML = '';

    ALL_MATCHES.forEach((match, i) => {
        let clone = template.content.cloneNode(true);

        clone.querySelector('span').innerText = new Date(match.timestamp).toLocaleString()
        clone.querySelectorAll('select')[0].innerHTML = document.getElementById('add-match-winner').innerHTML
        clone.querySelectorAll('select')[1].innerHTML = document.getElementById('add-match-loser').innerHTML
        clone.querySelectorAll('select')[0].value = match.winner
        clone.querySelectorAll('select')[1].value = match.loser
        clone.querySelectorAll('select')[0].id = 'match-select-winner' + (i + 1).toString()
        clone.querySelectorAll('select')[1].id = 'match-select-loser' + (i + 1).toString()

        clone.querySelectorAll('button')[0].id = 'match-button-salvar' + (i + 1).toString()
        clone.querySelectorAll('button')[0].disabled = true;

        let onChange = () => {
            if (document.getElementById('match-select-winner' + (i + 1).toString()).value !== match.winner
             || document.getElementById('match-select-loser' + (i + 1).toString()).value !== match.loser) {
                document.getElementById('match-button-salvar' + (i + 1).toString()).disabled = false
             } else {
                document.getElementById('match-button-salvar' + (i + 1).toString()).disabled = true
             }
        }
        clone.querySelectorAll('select')[0].addEventListener('change', onChange);
        clone.querySelectorAll('select')[1].addEventListener('change', onChange);

        clone.querySelectorAll('button')[0].addEventListener('click', () => {
            let winner = document.getElementById('match-select-winner' + (i + 1).toString()).value;
            let loser = document.getElementById('match-select-loser' + (i + 1).toString()).value;

            if (winner === "" || loser === "") { setTimeout(() => {alert('Partida precisa ter um ganhador e um perdedor')}, 50); return; }
            if (winner === loser) { setTimeout(() => {alert('Ganhador não pode ser igual ao perdedor')}, 50); return; }

            match.winner = winner;
            match.loser = loser;

            updateMatches(ALL_MATCHES)
            socket.emit('update_match', match.uuid, match.winner, match.loser)
        })
        clone.querySelectorAll('button')[1].addEventListener('click', () => {
            if (!confirm("Você tem certeza que deseja remover?")) { return }

            for(let i = 0; i < ALL_MATCHES.length; ++i) {
                if(ALL_MATCHES[i].uuid === match.uuid) {
                    ALL_MATCHES.splice(i, 1);
                    break;
                }
            }

            updateMatches(ALL_MATCHES)
            socket.emit('delete_match', match.uuid)
        })

        parent.appendChild(clone)
    });
}

function loadMainPage() {
    socket.emit('get_players', (status, players) => {
        if (status === false) {
            updateLogin(false)
            
            setTimeout(() => { alert('Credenciais inválidas') }, 50)
        }
        updatePlayers(players)
        socket.on('players_update', updatePlayers)
    })

    socket.emit('get_matches', (status, matches) => {
        if (status === false) {
            updateLogin(false)
            
            setTimeout(() => { alert('Credenciais inválidas') }, 50)
        }
        updateMatches(matches)
        socket.on('matches_update', updateMatches)
    })
}

document.getElementById('add-player-button').addEventListener('click', () => {
    let name = document.getElementById('add-player-name').value;

    if (name.length < 1) { setTimeout(() => {alert('Nome de jogador precisa ter pelo menos 1 char')}, 50); return; }

    for (let i = 0; i < ALL_PLAYERS.length; i++) {
        if (ALL_PLAYERS[i].name === name) {
            setTimeout(() => {alert('Nome de jogador precisa ser único')}, 50);
            return;
        }
    }

    let player = { name: name }
    ALL_PLAYERS.push(player);
    socket.emit('create_player', player)
    updatePlayers(ALL_PLAYERS)
    updateMatches(ALL_MATCHES)
})

document.getElementById('add-match-button').addEventListener('click', () => {
    let winner = document.getElementById('add-match-winner').value
    let loser = document.getElementById('add-match-loser').value

    if (winner === "" || loser === "") { setTimeout(() => {alert('Partida precisa ter um ganhador e um perdedor')}, 50); return; }
    if (winner === loser) { setTimeout(() => {alert('Ganhador não pode ser igual ao perdedor')}, 50); return; }

    const buffer = new Array();
    uuidv4(null, buffer, 0);

    let match = {
        timestamp: Date.now(),
        uuid: btoa(String.fromCharCode(...new Uint8Array(buffer))),
        winner: winner,
        loser: loser
    };
    ALL_MATCHES.push(match)
    socket.emit('create_match', match)
    updateMatches(ALL_MATCHES)
})