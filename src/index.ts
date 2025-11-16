import { run } from './server'

async function main() {
  await run()
}

main()
  .catch((error) => {
    console.error('Failed to start server:', error)
    process.exit(1)
  })
  .then(() => console.log('the program completed'))
