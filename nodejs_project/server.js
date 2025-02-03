const http = require('http');
const fs = require('fs');
const path = require('path');

const USERS_FILE = 'users.json';

// Load users
const loadUsers = () => {
    if (!fs.existsSync(USERS_FILE)) return [];
    try {
        return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8') || '[]');
    } catch (error) {
        console.error("Error reading users.json:", error);
        return [];
    }
};

// Save users
const saveUsers = (users) => {
    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
    } catch (error) {
        console.error("Error saving users.json:", error);
    }
};


const saveInbox = (userId, inbox) => {
    let users = loadUsers();
    const index = users.findIndex(user => user.id === userId);

    if (index === -1) {
        console.error(`User with ID ${userId} not found.`);
        return false;
    }

    users[index].inbox = inbox;
    saveUsers(users);
    return true;
};

const findInboxByUserId = (userId) => {
    const users = loadUsers();
    const user = users.find(user => user.id === userId);
    return user ? user.inbox : null;
};
http.createServer((req, res) => {
    if (req.url === '/' && req.method === 'GET') {

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ Register_user: "http://localhost:3000/register",
            Delete_user: "http://localhost:3000/delete",
            Show_users: "http://localhost:3000/users",
            Send_message: "http://localhost:3000/(Sender Number)/sendmsg/(Receiver Number)",
            Delete_message: "http://localhost:3000/(Sender Number)/deletemsg",
            Samples: "http://localhost:3000/bodysamples",
            author: "Adrian Barnak" }));
    }

    else if (req.url === '/register' && req.method === 'POST') {
        let body = '';

        req.on('data', (chunk) => {
            body += chunk.toString();
        });

        req.on('end', () => {
            if (!body) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: "Empty JSON body received" }));
            }

            try {
                console.log("Raw request body:", body);

                const parsedBody = JSON.parse(body);
                if (!parsedBody.name || !parsedBody.email) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: "Name and email are required" }));
                }

                // Load existing users
                const users = loadUsers();


                let newId = 1;

                while (newId <= users.length) {
                    const user = users.find(user => user.id === newId);
                    if (user) {
                        newId++;
                    } else {
                        break;
                    }
                }

                const newUser = { id: newId, ...parsedBody, inbox: [] };

                // Add the new user to the users array
                users.push(newUser);

                users.sort((a, b) => a.id - b.id)

                // Save updated list of users to the JSON file
                saveUsers(users);

                console.log("User added:", newUser);

                // Send response back to the client
                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: "User registered successfully", user: newUser }));

            } catch (error) {
                console.error("JSON Parsing Error:", error.message);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: "Invalid JSON format" }));
            }
        });

        req.on('error', (err) => {
            console.error("Request error:", err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: "Internal server error" }));
        });
    } else if (req.url === '/delete' && req.method === 'POST') {
        let body = '';

        req.on('data', (chunk) => {
            body += chunk.toString();
        });

        req.on('end', () => {
            if (!body) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: "Empty JSON body received" }));
            }

            try {
                console.log("Raw request body id:", body);

                const parsedBody = JSON.parse(body);
                if (!parsedBody.id) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: "ID is required" }));
                }

                // Load existing users
                let _users = loadUsers();

                const index = parsedBody.id

                const user = _users.find(user => user.id === parsedBody.id);

                if (!user) return res.end(JSON.stringify({ error: "User not found" }))

                // delete user
                _users = _users.filter(user => user.id !== index)



                // Save updated list of users to the JSON file
                saveUsers(_users);

                console.log("User deleted: " + user);

                // Send response back to the client
                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: "User " + user + " deleted successfully"}));

            } catch (error) {
                console.error("JSON Parsing Error:", error.message);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: "Invalid JSON format" }));
            }
        });

        req.on('error', (err) => {
            console.error("Request error:", err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: "Internal server error" }));
        });
    }

    else if (req.url === '/users' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(loadUsers()));
    }

    else if (req.url === '/bodysamples' && req.method === 'GET') {
        // Read and serve the samples.html file
        const filePath = path.join(__dirname, 'samples.html');

        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Error loading samples.html');
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(data);
            }
        });
    }

    else if (req.method === 'POST') {
        const parts = req.url.slice(1).split("/");
        const size =  parts.length;
        if(size === 2) {   // removing a message
            const userId = Number(parts[0]);
            const action = parts[1];

            if (!userId) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: "ID is required" }));
            }

            const user = loadUsers().find(user => user.id === userId);
            if (!user) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: "User not found" }));
            }

            if (String(action) !== 'deletemsg') {//string type
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: "Page not found (bad action request)" }));
            }

            let body = '';
            req.on('data', (chunk) => {
                body += chunk.toString();
            });

            req.on('end', () => {
                if (!body) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: "Empty JSON body received" }));
                }
                try {
                    console.log("Raw inbox request body:", body);
                    const parsedInbox = JSON.parse(body);
                    if (!parsedInbox.id) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        return res.end(JSON.stringify({ error: "Message is required" }));
                    }
                    let inbox = findInboxByUserId(userId);
                    if (!inbox) {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        return res.end(JSON.stringify({ error: "Inbox not found" }));
                    }

                    const messageID = parsedInbox.id;
                    const message = inbox.find(msg => msg.id === messageID);

                    inbox = inbox.filter(msg => msg.id !== messageID);
                    saveInbox(userId, inbox);
                    console.log("Message deleted:", messageID);

                    res.writeHead(201, { 'Content-Type': 'application/json' });
                    res.end('Message deleted successfully ' + message);


                } catch (error) {
                    console.error("JSON Parsing Error:", error.message);
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: "Invalid JSON format" }));
                }
            })




        } else if (size === 3) { //sending a message
            const senderId = Number(parts[0]);
            const action = parts[1];
            const receiverId = Number(parts[2]);

            if (!senderId || !receiverId) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: "IDs are required" }));
            }

            const sender = loadUsers().find(user => user.id === senderId);
            const receiver = loadUsers().find(user => user.id === receiverId);

            if (!sender || !receiver) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: "User(s) not found" }));
            }

            if (String(action) !== 'sendmsg') {//string type
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: "Wrong action request)" }));
            }

            let body = '';
            req.on('data', (chunk) => {
                body += chunk.toString();
            });
            req.on('end', () => {
                if (!body) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: "Empty JSON body received" }));
                }
                try {
                    console.log("Raw inbox request body:", body);
                    const parsedInbox = JSON.parse(body);
                    if (!parsedInbox.message) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        return res.end(JSON.stringify({ error: "Message is required" }));
                    }
                    let inbox = findInboxByUserId(receiverId);
                    if (!inbox) {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        return res.end(JSON.stringify({ error: "Inbox not found" }));
                    }

                    let inboxID = 1;

                    if(inbox.length > 0) {
                        inboxID = Math.max(...inbox.map(msg => msg.id)) + 1;
                    }

                    const senderEmail = loadUsers().find(user => user.id === senderId).email;

                    const newMessage = {id : inboxID, message: parsedInbox.message, sender: senderEmail};
                    inbox.push(newMessage);

                    saveInbox(receiverId, inbox);
                    console.log("Message sent:", newMessage);

                    res.writeHead(201, { 'Content-Type': 'application/json' });
                    res.end('Message sent successfully ' + newMessage);

                } catch (error) {
                    console.error("JSON Parsing Error:", error.message);
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: "Invalid JSON format" }));
                }
            })


        } else{
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: "Page not found (more or less arguments than expected)" }));
        }
    }else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: "Page not found" }));
    }

}).listen(3000, () => {
    console.log('Server is running on port 3000');
});
