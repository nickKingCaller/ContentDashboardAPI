const express = require('express');
const app = express();

const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const helmet = require('helmet');
const cors = require('cors');

const config = require('./config');

const v1Routes = require('./routes/v1');

app.use(express.json());
app.use(helmet());
app.use(cors());

// Access environment variables
const port = config.port;


const swaggerOptions = {
    swaggerDefinition: {
      openapi: '3.0.0',
      info: {
        title: 'Content Dashboard API',
        version: '1.0.0',
        description: 'Content Dashboard API with Swagger documentation',
        contact: {
          name: 'Flagstone Dev Team',
          url: 'https://Flagstone.com', // Optional URL for the contact
          email: 'dev@Flagstone.com'
        },
        version: "v1",
        servers: [
            {
              url: `http://localhost:${port}/v1`, // Dynamic server URL with port
              description: 'Version 1 of API',
            },
          ],
      },
    },
    apis: ['./routes/v1/contentDashboard/*.js'], // Path to the API docs (this file)
    // apis: ['./routes/**/*.js'], // Path to all the API docs
  };
  
  // Swagger docs setup
  const swaggerDocs = swaggerJsDoc(swaggerOptions);

  // Serve swagger.json file
  app.get('/swagger.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.json(swaggerDocs);
  });

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs, {
    explorer: true, // Enable API explorer
  }));

  app.get('/', (req, res) => {
    res.redirect('/api-docs');
  });

  app.use('/v1', v1Routes);  // API v1 routes

  app.disable('x-powered-by');

  // custom 404
  app.use((req, res) => {
    res.status(404).send("Sorry can't find that!")
  })

  // custom error handler
  app.use((err, req, res) => {
    console.error(err.stack)
    res.status(500).send('Internal Server Error')
  })

  // const options = {
  //   key: fs.readFileSync('key.pem'),
  //   cert: fs.readFileSync('cert.pem')
  // };

  // https.createServer(app).listen(port, () => {
  //   console.log(`Server running at https://localhost:${port}`);
  // });

  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });