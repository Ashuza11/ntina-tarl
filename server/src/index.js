import "dotenv/config"
import express from "express"
import cors from "cors"
import routes from "./routes/index.js"

const app = express()

app.use(cors())
app.use(express.json())
app.use("/api", routes)

const port = process.env.PORT || 3001
app.listen(port, () => {
  console.log(`Ntina server listening on port ${port}`)
})

export default app
