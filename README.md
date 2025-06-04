A TypeScript library for cryptocurrency portfolio tracking and tax reporting, specifically designed for French tax regulations.
This project is currently in development with a focus on the core library and backend functionality.
Documentation and user interface improvements will follow in future updates.

## Project Status

🚧 **Under Active Development (06-2025)** 🚧

# Stage 0

Install docker and npm (any version) on the host computer.
After that we will work in a specific container.

# Stage 1: Create and start the container:

```
sh$ npm run build-container
sh$ npm run shell

node@52939f3b198e:~$ pwd
/home
node@52939f3b198e:~$ ls -l
total 12
-rw-rw-r-- 1 node node  841 Oct  1 07:58 DOCKERFILE
-rw-rw-r-- 1 node node 1071 Oct  1 07:56 LICENSE
-rw-rw-r-- 1 node node 1136 Oct  1 08:15 package.json
node@52939f3b198e:~$ whoami
node
node@52939f3b198e:~$ exit
exit

sh$
```

# Start 2: Run the node application

```
sh$ npm start
# or
sh$ npm run shell
node@2b9634cf5c20:~$ exec yarn start-in-container
```

# Stage 3: Run Mocha

```
sh$ npm test
# or
sh$ npm run shell
node@2b9634cf5c20:~$ exec yarn test-in-container
```

# Stage 4: Run ESLint

```
sh$ npm run lint
# or
sh$ npm run shell
node@2b9634cf5c20:~$ exec yarn lint-in-container
```

## Important Notice

This project is being actively developed to meet the 2025 French tax declaration deadline.
The current focus is on core functionality and backend stability.
Comprehensive documentation and user interface improvements will be added in subsequent updates.

## License

See [LICENSE](LICENSE) file for details.
