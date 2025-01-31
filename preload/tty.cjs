prompt = async config => {
  // console.log(`\n\n >>> TTY PROMPT <<< \n\n`)
  if (config?.choices) {
    config = { ...config, type: "autocomplete" }
  }
  config = { type: "input", name: "value", ...config }

  if (typeof config.choices === "function") {
    let f = config.choices

    if (config.choices.length === 0) {
      let choices = config.choices()
      if (typeof choices?.then === "function")
        choices = await choices
      config = {
        ...config,
        choices,
      }
    } else {
      let suggest = _.debounce(async function (input) {
        let results = await f(
          input.replace(/[^0-9a-z]/gi, "")
        )
        this.choices = await this.toChoices(results)
        await this.render()

        return this.choices
      }, 250)
      config = {
        ...config,
        choices: [],
        suggest,
      }
    }
  }

  // TODO: Strip out enquirer autocomplete
  let { value } = await require("enquirer").prompt(config)

  return value
}

arg = async (messageOrConfig = "Input", choices) => {
  let firstArg = args.length ? args.shift() : null
  if (firstArg) {
    let valid = true
    if (messageOrConfig?.validate) {
      let { validate } = messageOrConfig
      let validOrMessage = await validate(firstArg)
      if (
        typeof validOrMessage === "string" ||
        !validOrMessage
      ) {
        valid = false
        console.log(validOrMessage)
      }
    }

    if (valid) {
      return firstArg
    }
  }

  let config = {}

  if (typeof messageOrConfig === "string") {
    config.message = messageOrConfig
  } else {
    config = messageOrConfig
  }

  config.choices = choices
  let input = await prompt(config)

  let command = chalk`{green.bold ${
    env.KIT_SCRIPT_NAME
  } {yellow ${input}}} {yellow ${argOpts.join(" ")}}`

  // TODO: Should I care about teaching this?
  let nextTime =
    chalk`👉 Run without prompts by typing: ` + command
  // console.log(nextTime)

  return input
}

npm = async packageName => {
  try {
    return require(packageName)
  } catch (error) {
    if (!arg?.trust) {
      let installMessage = chalk`\n{green ${env.KIT_SCRIPT_NAME}} needs to install the npm library: {yellow ${packageName}}`

      let downloadsMessage = chalk`{yellow ${packageName}} has had {yellow ${
        (
          await get(
            `https://api.npmjs.org/downloads/point/last-week/` +
              packageName
          )
        ).data.downloads
      }} downloads from npm in the past week`

      let packageLink = `https://npmjs.com/package/${packageName}`
      let readMore = chalk`
    Read more about {yellow ${packageName}} here: {yellow ${packageLink}}
    `
      echo(installMessage)
      echo(downloadsMessage)
      echo(readMore)

      let message = chalk`Do you trust {yellow ${packageName}}?`

      let config = {
        message,
        choices: [
          { name: "Yes", value: true },
          { name: "No", value: false },
        ],
      }

      let trust = await prompt(config)
      if (!trust) {
        echo(`Ok. Exiting...`)
        exit()
      }
    }
    echo(
      chalk`Installing {yellow ${packageName}} and continuing.`
    )

    await cli("install", packageName)
    let packageJsonPath = kenvPath(
      "node_modules",
      packageName,
      "package.json"
    )
    let packageJson = require(packageJsonPath)

    let packageImport = kenvPath(
      "node_modules",
      packageName,
      packageJson?.main || "index.js"
    )

    return require(packageImport)
  }
}
