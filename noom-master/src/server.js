import http from "http";
import SocketIO from "socket.io";
import express, {request} from "express";

const app = express(); //const 변수는 고정값 수정및 재정의 안됨,


app.set("view engine", "ejs");// ejs를 사용하려면 npm install ejs 설치-> 2번째 매개변수에 ejs넣기
app.set("views", __dirname + "/views");
app.use("/public", express.static(__dirname + "/public"));
app.get("/", (_, res) => res.render("home"));
app.get("/*", (_, res) => res.redirect("/"));

const httpServer = http.createServer(app);//http를 이용해서 서버 생성
const wsServer = SocketIO(httpServer);//웹소켓을 이용해서 서버 생성 http 인자를 전달하면 http 웹소켓 둘다 작동이 된다 클라이언트와 서버를 연결하기 위해서

let peerInfo = {};
let room_nickname = [];
let room = {};
//----------------------------------------------------------------------------------------------------------------
//웹소켓 서버에 클라이언트와 연결된것 확인
wsServer.on("connection", (socket) => {
    socket["nickname"] = "Anonymous";

    //방이름
    socket.on("enter_room", (how,roomName,user_nick2,done) => {
        const keysOfPerson = Object.keys(peerInfo);
        const user_nick = keysOfPerson.find((key) => peerInfo[key] === socket.id);

        console.log("how")
        console.log(how)

        const room_confirm = Object.keys(room).includes(roomName)

        if (how === "방만들기"){
            if (room_confirm) {
                socket.emit("make_room_client", true, null);//emit은 첫번째는 이벤트명,두번째는 데이터 형태,세번째는 호출하고 싶은 함수
            }
            //닉네임이 이미 존재했을때
            else if (room_nickname.includes(user_nick2)) {
                socket.emit("make_room_client", null, true);//emit은 첫번째는 이벤트명,두번째는 데이터 형태,세번째는 호출하고 싶은 함수
            }else{
                room[roomName] = user_nick2;
                room_nickname.push(user_nick2);
                socket.emit("make_room_client", null, null);//emit은 첫번째는 이벤트명,두번째는 데이터 형태,세번째는 호출하고 싶은 함수
            }
        }

        console.log("room");
        console.log(room);

        socket.join(roomName);
        socket.to(roomName).emit("welcome", socket.id, user_nick2);//emit은 첫번째는 이벤트명,두번째는 데이터 형태,세번째는 호출하고 싶은 함수
        // 'connection' : soket.io의 기본 이벤트, 사용자가 웹사이트에 들어왔을 때 연결된다. 두 번째 변수는 socket은 연결이
        // 성공 했을 때 connection 에 대한 정보를 담고 있다.
    });


    //방을 나갔을때
    socket.on("disconnect", () => {
        console.log("disconnect");
        const keysOfPerson = Object.keys(peerInfo);
        const user_nick = keysOfPerson.find((key) => peerInfo[key] === socket.id);
        console.log(user_nick);
        socket.broadcast.emit("leave", socket.id, user_nick);

    });


    socket.on("set_nickname", (nickname,room_name,삭제) => {
        peerInfo[nickname] = socket.id//객체형태로 키값 닉네임 벨류값 소켓아이디
        socket["nickname"] = nickname;


        const room_confirm = Object.keys(room).includes(room_name)
        //
        //방이름이 존재하지 않았을떄
        if (!room_confirm) {
            socket.emit("room_confirm", true, null);//emit은 첫번째는 이벤트명,두번째는 데이터 형태,세번째는 호출하고 싶은 함수
        }

        //닉네임이 이미 존재했을때
        else if (room_nickname.includes(nickname)) {
            socket.emit("room_confirm", null, true);//emit은 첫번째는 이벤트명,두번째는 데이터 형태,세번째는 호출하고 싶은 함수
        }
        else{
            socket.emit("room_confirm", null, null);//emit은 첫번째는 이벤트명,두번째는 데이터 형태,세번째는 호출하고 싶은 함수

        }

        if (삭제 !== null) {

            for (let i = 0; i < room_nickname.length; i++) {
                if (room_nickname[i] === nickname) {
                    room_nickname.splice(i, 1);
                    i--;
                }
            }
        }
    });


    socket.on("send_offer", (offer, userId) => {
        console.log("send_offer  서버    ");
        console.log(userId);
        console.log("객체값 확인");
        console.log(peerInfo);
        console.log("객체 키값 확인");

        console.log(socket.id);
        console.log("소켓값 확인");
        const keysOfPerson = Object.keys(peerInfo);
        const user_nick = keysOfPerson.find((key) => peerInfo[key] === socket.id);
        console.log(user_nick);


        socket.to(userId).emit("receive_offer", offer, socket.id, user_nick);

    });


    socket.on("send_answer", (answer, userId) => {


        console.log("send_answer    서버    ");

        //==은 연산자를 이용하여 서로 다른 값을 비교
        //=== 값과 자료형까지 비교
        // console.log(count + "   속성갯수확인")
        // socket.to(roomName).emit("receive_answer", answer);//에러부분
        socket.to(userId).emit("receive_answer", answer, socket.id);
    });


    //----------------------------------------------------------------------------------------------------------------


    socket.on("send_ice", (ice, userId) => {
        if (ice != null) {
            console.log("send_ice     서버     userId ");
            console.log(JSON.stringify(userId))
            console.log("send_ice     서버     socket.id ");

            console.log(JSON.stringify(socket.id))
            socket.to(userId).emit("receive_ice", ice, socket.id); //b에게 a의 소켓아이디값을 보낸다
        }
    });
});

const handleListen = () => console.log(`Listening on http://localhost:1000`);
httpServer.listen(1000, handleListen);//서버주소 만듬
