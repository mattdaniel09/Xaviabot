const pr = global.config.PREFIX
const regex = new RegExp(`^${pr}`)
const noPrefix = ["ai", "gpt", "claude", "blackbox", "gojo"] //names that does not need a prefix


async function onCall(methods) {
  const {commands} = global.plugins;
  methods.args = methods.message.args.slice(1)
  const called = methods.message.args[0]?.replace(regex, "").toLowerCase();
  if(noPrefix.includes(called)) {
    
    commands.forEach((cmd,name) => {
      if(called?.toLowerCase() == name) {
        return cmd(methods)
      }
    })
    
    
  }
}

export default {
  onCall
}
