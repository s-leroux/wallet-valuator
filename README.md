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

