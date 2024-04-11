const express = require('express')
const app = express()
const port = 5000

const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const { User } = require('./models/User');

const config = require('./config/key');

const { auth } = require('./middleware/auth');

// application/x-www-form-urlencoded 같은 데이터를 분석해서 가져옴
app.use(bodyParser.urlencoded({extended: true}));

// application/json 같은 데이터를 분석해서 가져옴
app.use(bodyParser.json());
app.use(cookieParser());

const mongoose = require('mongoose')
mongoose.connect(config.mongoURI).then(() => console.log('MongoDB Connected...'))
.catch(err => console.log(err))



app.get('/', (req, res) => {
  res.send('Hello World! 안녕하세요! 새해 복 많이 받으세요!')
})

app.get('/api/hello', (req, res) => {
    res.send("안녕하세요")
})

app.post('/api/users/register', (req, res) =>{

    // 회원 가입 할 때 필요한 정보들을 client에서 가져오면
    // 그것들을 DB에 넣어준다.

    const user = new User(req.body) // req.body에 json 형태의 데이터가 들어가있음. <- bodyParser가 있기 때문에 가능
    
    user.save().then(()=>{
        res.status(200).json({
            success:true
        })
    }).catch((err)=>{
        return res.json({success:false, err})
    })
    
   
})

// 로그인
app.post('/api/users/login', (req, res) => {
    // 이메일이 DB에 있는지 확인
    User.findOne({
        email: req.body.email
    })
    .then (async (user) => {
        if (!user) {
            throw new Error("제공된 이메일에 해당하는 유저가 없습니다.")
        }
        // 비밀번호가 일치하는지 확인
        const isMatch = await user.comparePassword(req.body.password);
        return { isMatch, user };
    })
    .then(({ isMatch, user }) => {
        console.log(isMatch);
        if (!isMatch) {
            throw new Error("비밀번호가 틀렸습니다.")
        }
        // 로그인 완료
        return user.generateToken();
    })
    .then ((user) => {
        // 토큰 저장 (쿠키, localstorage ...)
        return res.cookie("x_auth", user.token)
        .status(200)
        .json({
            loginSuccess: true,
            userId: user._id
        });
    })
    .catch ((err) => {
        console.log(err);
        return res.status(400).json({
            loginSuccess: false,
            message: err.message
        });
    })
});



app.get('/api/users/auth', auth, (req, res) => {
    // 여가까지 미들웨어를 통과해왔다는 얘기는 Authentication이 True라는 뜻
    res.status(200).json({
        _id : req.user._id,
        isAdmin : req.user.role === 0 ? false : true,
        isAuth: true,
        email : req.user.email,
        name : req.user.name,
        lastname: req.user.lastname,
        role : req.user.role,
        image : req.user.image
    })
})

// app.get('/api/users/logout', auth, (req, res) =>{
    
//     User.findOneAndUpdate({ _id: req.user._id},
//         { token: ""},
//         (err, user) =>{
//             if(err) return res.json({ success: false, err});
//             return res.status(200).send({
//                 success: true
//             })
//         })
// })
app.get('/api/users/logout', auth, async (req, res) =>{
    try {
        await User.findOneAndUpdate({ _id: req.user._id }, { token: "" });
        return res.status(200).send({ success: true });
    } catch (err) {
        return res.json({ success: false, err });
    }
});



app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})