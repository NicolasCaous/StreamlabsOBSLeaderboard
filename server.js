const express = require('express')
const fs = require('fs')

var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http, {pingInterval: 200});

app.use('/admin', express.static('admin'))
app.use('/', express.static('client'))

const ADMIN_TOKEN = Math.random().toString(36).substring(7).toUpperCase()
console.log("ADMIN_TOKEN:", ADMIN_TOKEN)

let db = {
  players: [],
  matches: []
}
if (fs.existsSync('data.json')) db = JSON.parse(fs.readFileSync('data.json', 'utf8'));

let saveDB = () => fs.writeFile('data.json', JSON.stringify(db, null, 2) , 'utf-8', () => {});

let fireUpdates = async (socket) => {
  await socket.to('admins').emit('players_update', db.players)
  await socket.to('admins').emit('matches_update', db.matches)
  await io.to('clients').emit('leaderboard_update', computeLeaderboard())
};

let computeLeaderboard = () => {
  let leaderboard = []

  db.players.forEach((player, i) => {
    leaderboard.push({
      name: player.name,
      wins: 0,
      losses: 0
    })
  })

  db.matches.forEach((match, i) => {
    leaderboard.forEach((player, j) => {
      if (player.name === match.winner) player.wins++;
      if (player.name === match.loser) player.losses++;
    })
  })

  leaderboard.sort((a, b) => {
    let awr = a.wins * 2 - a.losses;
    let bwr = b.wins * 2 - b.losses;

    /*let awr = 0;
    if ((a.wins + a.losses) !== 0) awr = (a.wins/(a.wins + a.losses))

    let bwr = 0;
    if ((b.wins + b.losses) !== 0) bwr = (b.wins/(b.wins + b.losses))*/

    return awr < bwr ? 1 : -1
  })

  return leaderboard.splice(0, 5)
}

io.on('connection', (socket) => {
  socket.join('clients', () => {
    console.log('connect [clients]', socket.id)
    socket.currentRoom = 'clients'
  })

  socket.on('disconnect', (reason) => {
    console.log('disconnect [' + socket.currentRoom + ']', socket.id)
  });

  socket.on('login_as_admin', (token, callback) => {
    if (token.toUpperCase() === ADMIN_TOKEN) {
      socket.leave('clients', () => {
        console.log('disconnect [' + socket.currentRoom + ']', socket.id)
        socket.join('admins', () => {
          console.log('connect [admins]', socket.id)
          socket.currentRoom = 'admins'
          callback(true);
        })
      })
    } else {
      callback(false);
    }
  })

  socket.on('get_players', (callback) => {
    if (socket.currentRoom != 'admins') callback(false, [])

    callback(true, db.players)
  })
  socket.on('get_matches', (callback) => {
    if (socket.currentRoom != 'admins') callback(false, [])

    callback(true, db.matches)
  })

  socket.on('trigger_leaderboard', () => {
    io.to('clients').emit('leaderboard_update', computeLeaderboard())
  })

  socket.on('create_player', (player) => {
    if (socket.currentRoom != 'admins') return;

    if (player.name.length < 1) return;

    for (let i = 0; i < db.players.length; ++i) {
      if(db.players[i].name === player.name) return;
    }

    db.players.push(player)

    saveDB()
    fireUpdates(socket)
  })

  socket.on('update_player', (oldName, newName) => {
    if (socket.currentRoom != 'admins') return;

    if (newName.length < 1) return;

    for (let i = 0; i < db.players.length; ++i) {
      if(db.players[i].name === newName) return;
    }

    for (let i = 0; i < db.matches.length; ++i) {
      if (db.matches[i].winner === oldName) {
        db.matches[i].winner = newName
      }
      if (db.matches[i].loser === oldName) {
        db.matches[i].loser = newName
      }
    }

    for (let i = 0; i < db.players.length; ++i) {
      if(db.players[i].name === oldName) {
        db.players[i].name = newName
        break
      }
    }

    saveDB()
    fireUpdates(socket)
  })

  socket.on('delete_player', (name) => {
    if (socket.currentRoom != 'admins') return;

    for (let i = 0; i < db.players.length; ++i) {
      if(db.players[i].name === name) {
        db.players.splice(i, 1);
        break
      }
    }

    for (let i = 0; i < db.matches.length; ++i) {
      if (db.matches[i].winner === name || db.matches[i].loser === name) {
        db.matches.splice(i, 1);
        --i;
      }
    }

    saveDB()
    fireUpdates(socket)
  })

  socket.on('create_match', (match) => {
    if (socket.currentRoom != 'admins') return;

    if (match.winner === "" || match.loser === "") return
    if (match.winner === match.loser) return

    db.matches.push(match)

    saveDB()
    fireUpdates(socket)
  })

  socket.on('update_match', (uuid, winner, loser) => {
    if (socket.currentRoom != 'admins') return;

    if (winner === "" || loser === "") return
    if (winner === loser) return

    let winnerLocated = false;
    let loserLocated = false;
    for (let i = 0; i < db.players.length; ++i) {
      if(db.players[i].name === winner) {
        winnerLocated = true
        if (loserLocated) break
      }
      if(db.players[i].name === loser) {
        loserLocated = true
        if (winnerLocated) break
      }
    }

    if (!(winnerLocated && loserLocated)) return

    for (let i = 0; i < db.matches.length; ++i) {
      if (db.matches[i].uuid === uuid) {
        db.matches[i].winner = winner
        db.matches[i].loser = loser
        break
      }
    }

    saveDB()
    fireUpdates(socket)
  })

  socket.on('delete_match', (uuid) => {
    if (socket.currentRoom != 'admins') return;

    for (let i = 0; i < db.matches.length; ++i) {
      if (db.matches[i].uuid === uuid) {
        db.matches.splice(i, 1);
        break
      }
    }

    saveDB()
    fireUpdates(socket)
  })
});

http.listen(7778, () => {
  console.log('listening on *:7778');
});