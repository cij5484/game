import "./style.css";
import { createGame } from "./game/createGame";

const parent = document.getElementById("app");
if (!parent) throw new Error("Missing game container: #app");

const game = createGame(parent);
import.meta.hot?.dispose(() => game.destroy(true));
