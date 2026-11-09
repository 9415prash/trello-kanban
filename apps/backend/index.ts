import express from "express";
import { prisma } from "db";
import jwt from "jsonwebtoken";
import authMiddleware from "./middleware";

const app = express();
app.use(express.json());

app.post("/signup", async (req,res) =>{
    const username = req.body.username;
    const password = req.body.password;

    await prisma.user.create({
        data:{
            username,
            password
        }
    })
    res.json({
        message: "signup done!"
    })
})


app.post("/SignIn", async (req,res) =>{
  const username = req.body.username;
  const password = req.body.password;

  const userExist = await prisma.user.findFirst({
    where: {
      username,
      password
    }
  });

  if (!userExist) {
    res.status(401).json({
      message: "Invalid username or password"
    });
    return;
  }

  try {
  const token = jwt.sign(username, "top_secreat")
  res.status(200).json({
    message : "you  sucessfully logged in"
  })
} catch(err) {
    res.status(403).json({
      message : "Somethings went wrong!!"
    })
}

});


app.post("/organization", authMiddleware, async (req,res) => {

});



app.post("/Boards");
app.post("/Board");
app.post("/invite");
app.post("/accept");
app.post("/section");
app.post("/issue");
app.get("/section");
app.get("/issue");
app.get("/issue/Id");
app.delete("/issue/Id");
app.delete("/section");
app.delete("/membership");
app.put("/board")
app.put("/issue")
app.post("/comment")



app.listen(3000);