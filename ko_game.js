var io;
var gameSocket;
var ko_id;
var wordPool = [];

/**
 * This function is called by index.js to initialize a new game instance.
 *
 * @param sio The Socket.IO library
 * @param socket The socket object for the connected client.
 */
exports.initGame = function(sio, socket){
    io = sio;
    gameSocket = socket;
    gameSocket.emit('connected', { message: "You are connected!" });

    // Host Events
    gameSocket.on('hostCreateNewGame', hostCreateNewGame);
    gameSocket.on('hostPreGame', hostPreGame);
    gameSocket.on('hostRoomFull', hostPrepareGame);
    gameSocket.on('displayTeams', displayTeams);
    gameSocket.on('hostTeamsSet', hostTeamsSet);
    gameSocket.on('hostCountdownFinished', hostStartGame);
    gameSocket.on('hostNextRound', hostNextRound);
    gameSocket.on('gameOver', gameOver);

    // Player Events
    gameSocket.on('playerJoinGame', playerJoinGame);
    gameSocket.on('playerPreGame', playerPreGame);
    gameSocket.on('playerAnswer', playerAnswer);
    gameSocket.on('teamDeduct', teamDeduct);
    gameSocket.on('playerRestart', playerRestart);
    gameSocket.on('playerCorrect', playerCorrect);


}

/* *******************************
   *                             *
   *       HOST FUNCTIONS        *
   *                             *
   ******************************* */

/**
 * The 'START' button was clicked and 'hostCreateNewGame' event occurred.
 */
function hostCreateNewGame() {
    // Create a unique Socket.IO Room
    var thisGameId = ( Math.random() * 100000 ) | 0;

    // Return the Room ID (gameId) and the socket ID (mySocketId) to the browser client
    this.emit('newGameCreated', {gameId: thisGameId, mySocketId: this.id});

    // Join the Room and wait for the players
    this.join(thisGameId.toString());

    wordPool = [];
    wordPool.length = 0;

};
function hostPreGame(data) {

    // Return the Room ID (gameId) and the socket ID (mySocketId) to the browser client

    //this.emit('beginPreGame', data);
    io.sockets.in(data.gameId).emit('beginPreGame', data);

};

/*
 * Two players have joined. Alert the host!
 * @param gameId The game ID / room ID
 */
function hostPrepareGame(data) {
    var sock = this;
    console.log(data.time);
    var data = {
        mySocketId : sock.id,
        gameId : data.gameId,
        time : data.time
    };
    //console.log("All Players Present. Preparing game...");
    io.sockets.in(data.gameId).emit('beginNewGame', data);
};
function displayTeams(data) {

    ko_id = data.ko_id;
    console.log("All Players Present. Preparing Teams...");
    console.log("Team Total: " + data.teamTotal);
    console.log("Team 1 p1: " + data.team1[0]);
    console.log("Team 1 p2: " + data.team1[1]);
    console.log("Team 2 p1: " + data.team2[0]);
    console.log("Team 2 p2: " + data.team2[1]);
    console.log("Team 3 p1: " + data.team3[0]);
    console.log("Team 3 p2: " + data.team3[1]);
    io.sockets.in(data.gameId).emit('displayPlayerTeams', data);
    populateQuestionPool(ko_id);

};

function hostTeamsSet(data) {

    console.log("All Players Present. Preparing Teams...");
    console.log(data.ko_id);
    console.log("Team Total: " + data.teamTotal);
    console.log("Team 1 p1: " + data.team1[0]);
    console.log("Team 1 p2: " + data.team1[1]);
    console.log("Team 2 p1: " + data.team2[0]);
    console.log("Team 2 p2: " + data.team2[1]);
    console.log("Team 3 p1: " + data.team3[0]);
    console.log("Team 3 p2: " + data.team3[1]);


    ko_id = data.ko_id;
    //io.sockets.in(data.gameId).emit('displayPlayerTeams', data);
    populateQuestionPool(ko_id);

};


/*
 * The Countdown has finished, and the game begins!
 * @param gameId The game ID / room ID
 */
function hostStartGame(gameId) {
    console.log('Game Started.');
    //io.sockets.in(data.gameId).emit('playerGameStarted',data);
    sendWord(0,gameId);
};

/**
 * A player answered correctly. Time for the next word.
 * @param data Sent from the client. Contains the current round and gameId (room)
 */

function hostNextRound(data) {
    if(data.round < wordPool.length ){
        // Send a new set of words back to the host and players.
        sendWord(data.round, data.gameId);
    } else {
        // If the current round exceeds the number of words, send the 'gameOver' event.
        sendWord(0,data.gameId);
    }
}
function gameOver(data) {
        console.log('Game Over...');
        io.sockets.in(data.gameId).emit('gameOver');
};
/* *****************************
   *                           *
   *     PLAYER FUNCTIONS      *
   *                           *
   ***************************** */

/**
 * A player clicked the 'START GAME' button.
 * Attempt to connect them to the room that matches
 * the gameId entered by the player.
 * @param data Contains data entered via player's input - playerName and gameId.
 */
function playerJoinGame(data) {
    //console.log('Player ' + data.playerName + 'attempting to join game: ' + data.gameId );

    // A reference to the player's Socket.IO socket object
    var sock = this;

    // Look up the room ID in the Socket.IO manager object.
    var room = gameSocket.manager.rooms["/" + data.gameId];

    // If the room exists...
    if( room != undefined ){
        // attach the socket id to the data object.
        data.mySocketId = sock.id;

        // Join the room
        sock.join(data.gameId);

        //console.log('Player ' + data.playerName + ' joining game: ' + data.gameId );

        // Emit an event notifying the clients that the player has joined the room.
        io.sockets.in(data.gameId).emit('playerJoinedRoom', data);

    } else {
        // Otherwise, send an error message back to the player.
        this.emit('error',{message: "This room does not exist."} );
    }
}
/**
@param data
*/
function playerPreGame(data) {

    // Return the Room ID (gameId) and the socket ID (mySocketId) to the browser client
    //this.emit('beginPreGame', data);
    io.sockets.in(data.gameId).emit('beginPreGame', data);

}


/**
 * A player has tapped a word in the word list.
 * @param data gameId
 */
function playerAnswer(data) {
    // console.log('Player ID: ' + data.playerId + ' answered a question with: ' + data.answer);

    // The player's answer is attached to the data object.  \
    // Emit an event with the answer so it can be checked by the 'Host'
    io.sockets.in(data.gameId).emit('hostCheckAnswer', data);
}
function teamDeduct(data) {
    // console.log('Player ID: ' + data.playerId + ' answered a question with: ' + data.answer);

    // The player's answer is attached to the data object.  \
    // Emit an event with the answer so it can be checked by the 'Host'
    io.sockets.in(data.gameId).emit('hostTeamDeduct', data);
}
function playerCorrect(data) {

    // Return the Room ID (gameId) and the socket ID (mySocketId) to the browser client
    //this.emit('beginPreGame', data);
    io.sockets.in(data.gameId).emit('playerAddPoints', data);

}

/**
 * The game is over, and a player has clicked a button to restart the game.
 * @param data
 */
function playerRestart(data) {
    // console.log('Player: ' + data.playerName + ' ready for new game.');

    // Emit the player's data back to the clients in the game room.
    data.playerId = this.id;
    io.sockets.in(data.gameId).emit('playerJoinedRoom',data);
}

/* *************************
   *                       *
   *      GAME LOGIC       *
   *                       *
   ************************* */

/**
 * Get a word for the host, and a list of words for the player.
 *
 * @param wordPoolIndex
 * @param gameId The room identifier
 */
function sendWord(wordPoolIndex, gameId) {
    var data = getWordData(wordPoolIndex);
    io.sockets.in(data.gameId).emit('newWordData', data);
}

/**
 * This function does all the work of getting a new words from the pile
 * and organizing the data to be sent back to the clients.
 *
 * @param i The index of the wordPool.
 * @returns {{round: *, word: *, answer: *, list: Array}}
 */
function getWordData(i){
    // Randomize the order of the available words.
    // The first element in the randomized array will be displayed on the host screen.
    // The second element will be hidden in a list of decoys as the correct answer


    //Shuffles Questions
    shuffle(wordPool);

    var question = wordPool[i].question;
    var cor_answer = wordPool[i].cor_ans;
    // Randomize the order of the decoy words and choose the first 5
    var decoys = wordPool[i].decoys;
    var roughDecoys = [];
    //var decoys = wordPool[i].decoys.slice(0,4);
    while (roughDecoys.length < 3) {
    var x = 0;
    var rnd = (Math.floor(Math.random() * wordPool.length));
        if (rnd == i) {
          rnd = Math.floor(Math.random() * wordPool.length);
          roughDecoys.push(wordPool[rnd].cor_ans[0]);
          x++;
        }
        else {
          rnd = Math.floor(Math.random() * wordPool.length);
          roughDecoys.push(wordPool[rnd].cor_ans[0]);
          x++;
        }
    if (roughDecoys.indexOf(wordPool[i].cor_ans[0]) > -1) {
      roughDecoys.pop();
      x--;
    }
    else {
      roughDecoys = remove_duplicates(roughDecoys);
    }

  }


    // Pick a random spot in the decoy list to put the correct answer
    var rnd = Math.floor(Math.random() * 4);
    roughDecoys.splice(rnd, 0, cor_answer[0]);
    decoys = remove_duplicates(roughDecoys)

    function remove_duplicates(arr) {
    var obj = {};
    var ret_arr = [];
    for (var i = 0; i < arr.length; i++) {
        obj[arr[i]] = true;
    }
    for (var key in obj) {
        ret_arr.push(key);
    }
    return ret_arr;
}

    // Package the words into a single object.
    var wordData = {
        round: i,
        question : question[0],   // Displayed Question
        answer : cor_answer[0], // Correct Answer
        list : decoys      // Word list for player (decoys and answer)
    };

    return wordData;
}
/*
 * Javascript implementation of Fisher-Yates shuffle algorithm
 * http://stackoverflow.com/questions/2450954/how-to-randomize-a-javascript-array
*/
function shuffle(sourceArray) {
    for (var i = 0; i < sourceArray.length - 1; i++) {

        var j = i + Math.floor(Math.random() * (sourceArray.length - i));

        var temp = sourceArray[j];
        sourceArray[j] = sourceArray[i];
        sourceArray[i] = temp;

    }
    return sourceArray;
}
/**
 * Each element in the array provides data for a single round in the game.
 *
 * In each round, two random "words" are chosen as the host word and the correct answer.
 * Five random "decoys" are chosen to make up the list displayed to the player.
 * The correct answer is randomly inserted into the list of chosen decoys.
 *
 * @type {Array}
 */
 //Import the mysql module
 var mysql = require('mysql');
 var express = require('express');


 /*var con = mysql.createConnection({
   host: "db4free.net",
   port: "3306",
   user: "cbell11",
   password: "password",
   database: "knockouttest",
 });*/
var con = mysql.createConnection({
   host: "knockout.fun",
   port: "3306",
   user: "knockoy5_cbell11",
   password: "Chandler0522!",
   database: "knockoy5_WPZEL",
 });
 con.connect(function(err) {
   if (err) throw err;
   console.log("Connected to mysql!");

 });
/* PHP Query CODE
$sql = "SELECT * FROM knockouts WHERE ko_id= '$ko_id'";
   $result = $conn->query($sql);
   while ($row = $result->fetch_assoc()) {
    $ko_name = $row['ko_name'];
    echo "<div style = 'text-align: center;' class = 'dark-text'>
            <h1 style = 'margin-left: 1px;'>".$row['ko_name']."<br></h1>
          </div><br><br>";
  }}
  */

function populateQuestionPool(ko_id){
  //var sql = mysql.format("SELECT * FROM knockouts WHERE ko_id ='"+ko_id+"'");
  var sql = mysql.format("SELECT * FROM qna WHERE ko_id='"+ko_id+"'");

  con.query(sql, function (err, rows, field) {
    if (err) throw err;
    console.log(rows);
    for(var i = 0; i < rows.length; i++){
    console.log('Q'+(i+1)+': '+rows[i].qna_q+'');
    console.log('Q'+(i+1)+': '+rows[i].qna_a+'');
    wordPool.push( {
        'question': [rows[i].qna_q],
        'cor_ans': [rows[i].qna_a],
        'decoys': [],
    });
    }


  });
}
/*var wordPool = [
     {
         "question"  : [ "1+1"],
         "cor_ans" : ["2"],
         "decoys" : []
     },

     {
         "question"  : [ "2+2"],
         "cor_ans" : ["4"],
         "decoys" : []
     },
     {
         "question"  : [ "3+3" ],
         "cor_ans" : ["6"],
         "decoys" : []
     },

     {
         "question"  : [ "4+4" ],
         "cor_ans" : ["8"],
         "decoys" : []
     },
     {
         "question"  : [ "5+5" ],
         "cor_ans" : ["10"],
         "decoys" : []
     },
     {
         "question"  : [ "6+6" ],
         "cor_ans" : ["12"],
         "decoys" : []
     },
     {
         "question"  : [ "7+7" ],
         "cor_ans" : ["14"],
         "decoys" : []
     },
     {
         "question"  : [ "8+8" ],
         "cor_ans" : ["16"],
         "decoys" : []
     }
   ]



*/
/*
var wordPool = [
    {
        "question"  : [ "1+1"],
        "cor_ans" : ["2"],
        //"decoys" : []
        "decoys" : [ "1","3","4"]
    },

    {
        "question"  : [ "2+2"],
        "cor_ans" : ["4"],
        //"decoys" : []
        "decoys" : [ "1","2","3" ]
    },
    {
        "question"  : [ "3+3" ],
        "cor_ans" : ["6"],
        //"decoys" : []
        "decoys" : [ "3","9","5" ]
    },

    {
        "question"  : [ "4+4" ],
        "cor_ans" : ["8"],
        //"decoys" : []
        "decoys" : [ "4","6","10",]
    },
    {
        "question"  : [ "5+5" ],
        "cor_ans" : ["10"],
        //"decoys" : []
        "decoys" : [ "6","8","12",]
    },
    {
        "question"  : [ "6+6" ],
        "cor_ans" : ["12"],
        //"decoys" : []
        "decoys" : [ "8","15","10",]
    },
    {
        "question"  : [ "7+7" ],
        "cor_ans" : ["14"],
        //"decoys" : []
        "decoys" : [ "10","12","16",]
    },
    {
        "question"  : [ "8+8" ],
        "cor_ans" : ["16"],
        //"decoys" : []
        "decoys" : [ "14","18","20",]
    }
  ]

  /*if(data.numPlayersInRoom > 20 ){
    $('#teamSelect').html("<div><button class = 'ccbtn btn-blue btn-simple deductTeamBtn' id = 'deductTeam1' type = 'button'> Team 1</button></div>");
    $('#teamSelect').append("<div><button class = 'deductTeamBtn ccbtn btn-red btn-simple' id = 'deductTeam2' type = 'button'>Team 2</button></div>");
    $('#teamSelect').append("<div><button class = 'deductTeamBtn ccbtn btn-gray btn-simple' id = 'deductTeam3' type = 'button'>Team 3</button></div>");
    $('#teamSelect').append("<div><button class = 'deductTeamBtn ccbtn btn-green btn-simple' id = 'deductTeam4' type = 'button'>Team 4</button></div>");
    $('#teamSelect').append("<div><button class = 'deductTeamBtn ccbtn btn-pink btn-simple' id = 'deductTeam5' type = 'button'>Team 5</button></div>");
    $('#teamSelect').append("<div><button class = 'deductTeamBtn ccbtn btn-orange btn-simple' id = 'deductTeam6' type = 'button'>Team 6</button></div>");
  }
  else if(data.numPlayersInRoom > 16 ){
    $('#teamSelect').html("<div><button class = 'ccbtn btn-blue btn-simple deductTeamBtn' id = 'deductTeam1' type = 'button'> Team 1</button></div>");
    $('#teamSelect').append("<div><button class = 'deductTeamBtn ccbtn btn-red btn-simple' id = 'deductTeam2' type = 'button'>Team 2</button></div>");
    $('#teamSelect').append("<div><button class = 'deductTeamBtn ccbtn btn-gray btn-simple' id = 'deductTeam3' type = 'button'>Team 3</button></div>");
    $('#teamSelect').append("<div><button class = 'deductTeamBtn ccbtn btn-green btn-simple' id = 'deductTeam4' type = 'button'>Team 4</button></div>");
    $('#teamSelect').append("<div><button class = 'deductTeamBtn ccbtn btn-pink btn-simple' id = 'deductTeam5' type = 'button'>Team 5</button></div>");
  }
  else if(data.numPlayersInRoom > 11){
    $('#teamSelect').html("<div><button class = 'ccbtn btn-blue btn-simple deductTeamBtn' id = 'deductTeam1' type = 'button'> Team 1</button></div>");
    $('#teamSelect').append("<div><button class = 'deductTeamBtn ccbtn btn-red btn-simple' id = 'deductTeam2' type = 'button'>Team 2</button></div>");
    $('#teamSelect').append("<div><button class = 'deductTeamBtn ccbtn btn-gray btn-simple' id = 'deductTeam3' type = 'button'>Team 3</button></div>");
    $('#teamSelect').append("<div><button class = 'deductTeamBtn ccbtn btn-green btn-simple' id = 'deductTeam4' type = 'button'>Team 4</button></div>");
  }
  else{
    $('#teamSelect').html("<div><button class = 'ccbtn btn-blue btn-simple deductTeamBtn' id = 'deductTeam1' type = 'button'> Team 1</button></div>");
    $('#teamSelect').append("<div><button class = 'deductTeamBtn ccbtn btn-red btn-simple' id = 'deductTeam2' type = 'button'>Team 2</button></div>");
    $('#teamSelect').append("<div><button class = 'deductTeamBtn ccbtn btn-gray btn-simple' id = 'deductTeam3' type = 'button'>Team 3</button></div>");
  }*/
