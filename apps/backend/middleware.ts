import jwt from "jsonwebtoken";

export default  function Middleware(req : any,res : any, next : any){
    const token = req.headers.token;
    
    if (!token){
       req.status(403).json({
        message  : "you had not logged in!!"
       }); return
    }
    try{
        const decode = jwt.verify(token,"top_secreat")
        const username =decode.username;
    }catch(err) {
        res.status(403).json({
            message : "Invalid token!! Please Sign In Again!!"
        })
    }
}

module.exports = (
    authMiddleware : authMiddleware
)