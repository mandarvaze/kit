//Menu: Share Script as Gist
//Description: Create a gist from the selected script

let { menu, exists, findScript, scripts } = await cli("fns")

let script = await arg(
  {
    message: `Which script do you want to share?`,
  },
  menu
)

let scriptPath = kenvPath("scripts", script) + ".js"

copy(await readFile(scriptPath, "utf8"))
setPromptText(`Copied content of script to clipboard`)
await wait(1000)
