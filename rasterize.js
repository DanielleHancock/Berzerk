/* GLOBAL CONSTANTS AND VARIABLES */

/* assignment specific globals */
var defaultEye = vec3.fromValues(0.5,0.5,-0.5); // default eye position in world space
var defaultCenter = vec3.fromValues(0.5,0.5,0.2); // default view direction in world space
var defaultUp = vec3.fromValues(0,1,0); // default view up vector
/* webgl and geometry data */
var gl = null; // the all powerful gl object. It's all here folks!
var inputTriangles = []; // the triangle data as loaded from input files
var numTriangleSets = 0; // how many triangle sets in input scene
var vertexBuffers = []; // this contains vertex coordinate lists by set, in triples
var triSetSizes = []; // this contains the size of each triangle set
var triangleBuffers = []; // lists of indices into vertexBuffers by set, in triples

/* shader parameter locations */
var vPosAttribLoc; // where to put position for vertex shader
var mMatrixULoc; // where to put model matrix for vertex shader
var pvmMatrixULoc; // where to put project model view matrix for vertex shader
var colorULoc; // where to put diffuse reflectivity for fragment shader

/* interaction variables */
var Eye = vec3.clone(defaultEye); // eye position in world space
var Center = vec3.clone(defaultCenter); // view direction in world space
var Up = vec3.clone(defaultUp); // view up vector in world space
var isPerspectiveProjection = false;
var transformMatrix = [];
var moveAmount = 0.005;
var gameIsOver = false;
var robotDirection = new Array(0,1,2,3);
var robotBulletDirection = new Array(0,0,0,0);
var robotBulletShot = new Array(false, false, false, false);
var gameOverSound;
var music;
var shootNoise;
var explosionNoise;
var directionFacing = 0;
var bulletShot = false;
var bulletDirection = 0;
var robotDead = new Array(false, false, false, false);
var score = 0;

var textContext;

// ASSIGNMENT HELPER FUNCTIONS

// does stuff when keys are pressed
function handleKeyDown(event) {
    if(!gameIsOver) {
        music.play();
    }
    switch (event.code) {
        case "KeyP": // change projection
        	isPerspectiveProjection = !isPerspectiveProjection;
        	if(!isPerspectiveProjection) {
        	    Eye = defaultEye;
        	    Center = defaultCenter;
        	    Up = defaultUp;
            }
        	break;

        case "KeyR":
            reset();
            break;

            
        // model transformation
        case "KeyA": // move player left
            var translationMatrix = mat4.create();
            mat4.fromTranslation(translationMatrix, vec3.fromValues(moveAmount,0,0));
            mat4.multiply(transformMatrix[0],transformMatrix[0],translationMatrix);
            if(!bulletShot) {
               mat4.multiply(transformMatrix[5], transformMatrix[5], translationMatrix);
            }
            directionFacing = 0;
            break;
        case "KeyD": // move player right
            var translationMatrix = mat4.create();
            mat4.fromTranslation(translationMatrix, vec3.fromValues(-1*moveAmount,0,0));
            mat4.multiply(transformMatrix[0],transformMatrix[0],translationMatrix);
            if(!bulletShot) {
                mat4.multiply(transformMatrix[5], transformMatrix[5], translationMatrix);
            }
            directionFacing = 1;
            break;
        case "KeyW": // move player up
            var translationMatrix = mat4.create();
            mat4.fromTranslation(translationMatrix, vec3.fromValues(0,moveAmount,0));
            mat4.multiply(transformMatrix[0],transformMatrix[0],translationMatrix);
            if(!bulletShot) {
                mat4.multiply(transformMatrix[5], transformMatrix[5], translationMatrix);
            }
            directionFacing = 2;
            break;
        case "KeyS": // move player down
            var translationMatrix = mat4.create();
            mat4.fromTranslation(translationMatrix, vec3.fromValues(0,-1*moveAmount,0));
            mat4.multiply(transformMatrix[0],transformMatrix[0],translationMatrix);
            if(!bulletShot) {
                mat4.multiply(transformMatrix[5], transformMatrix[5], translationMatrix);
            }
            directionFacing = 3;
            break;
        case "Space": //shoot
            if(!bulletShot) {
                shootNoise.play();
                bulletShot = true;
                bulletDirection = directionFacing;
            }
            break;
    } // end switch
} // end handleKeyDown

// set up the webGL environment
function setupWebGL() {
    // Set up keys
    document.onkeydown = handleKeyDown; // call this when key pressed
    
    // Get the image canvas, render an image in it
     var imageCanvas = document.getElementById("myImageCanvas"); // create a 2d canvas
      var cw = imageCanvas.width, ch = imageCanvas.height;
      imageContext = imageCanvas.getContext("2d");

    var textCanvas = document.getElementById("textCanvas"); // create a 2d canvas
    textContext = textCanvas.getContext("2d");
    textContext.font = "20px Verdana";
    textContext.textAlign = 'left';
    textContext.fillText('WASD to move', 10, 30);
    textContext.fillText('Space to shoot', 10, 60);
    textContext.fillText('R to reset', 10, 90);
    textContext.fillText('Score: ' + score, 10, 120);

     // create a webgl canvas and set it up
     var webGLCanvas = document.getElementById("myWebGLCanvas"); // create a webgl canvas
     gl = webGLCanvas.getContext("webgl"); // get a webgl object from it
     try {
       if (gl == null) {
         throw "unable to create gl context -- is your browser gl ready?";
       } else {
         gl.clearColor(0.0, 0.0, 0.0, 1.0); // use black when we clear the frame buffer
         gl.clearDepth(1.0); // use max when we clear the depth buffer
         gl.enable(gl.DEPTH_TEST); // use hidden surface removal (with zbuffering)
       }
     } // end try


    catch(e) {
      console.log(e);
    } // end catch
 
} // end setupWebGL

// read models in, load them into webgl buffers
function loadModels() {

    //inputTriangles =  getJSONFile(INPUT_TRIANGLES_URL,"triangles"); // read in the triangle data
    var data = ' [\n' +
    // player
    '    {"material": {"diffuse": [0.6,0.3,0.0]}, \n' +
    '    "vertices": [[0.5,0.8,0.02],[0.52,0.8,0.02],[0.52,0.82,0.02],[0.5,0.82,0.02],[0.5,0.8,0.01],[0.52,0.8,0.01],[0.52,0.82,0.01],[0.5,0.82,0.01]],\n' +
    '    "triangles": [[0,1,2],[2,3,0],[4,5,6],[6,7,4],[3,2,6],[6,7,3],[5,1,0],[0,4,5],[1,5,6],[6,2,1],[0,3,7],[7,4,0]] },\n' +
        // robot
        '    {"material": {"diffuse": [0.6,0.6,0.6]}, \n' +
        '    "vertices": [[0.7,0.7,0.02],[0.73,0.7,0.02],[0.73,0.73,0.02],[0.7,0.73,0.02],[0.7,0.7,0.008],[0.73,0.7,0.008],[0.73,0.73,0.008],[0.7,0.73,0.008]],\n' +
        '    "triangles": [[0,1,2],[2,3,0],[4,5,6],[6,7,4],[3,2,6],[6,7,3],[5,1,0],[0,4,5],[1,5,6],[6,2,1],[0,3,7],[7,4,0]] },\n' +
        // robot
        '    {"material": {"diffuse": [0.6,0.6,0.6]}, \n' +
        '    "vertices": [[0.7,0.7,0.02],[0.73,0.7,0.02],[0.73,0.73,0.02],[0.7,0.73,0.02],[0.7,0.7,0.008],[0.73,0.7,0.008],[0.73,0.73,0.008],[0.7,0.73,0.008]],\n' +
        '    "triangles": [[0,1,2],[2,3,0],[4,5,6],[6,7,4],[3,2,6],[6,7,3],[5,1,0],[0,4,5],[1,5,6],[6,2,1],[0,3,7],[7,4,0]] },\n' +
        // robot
        '    {"material": {"diffuse": [0.6,0.6,0.6]}, \n' +
        '    "vertices": [[0.7,0.7,0.02],[0.73,0.7,0.02],[0.73,0.73,0.02],[0.7,0.73,0.02],[0.7,0.7,0.008],[0.73,0.7,0.008],[0.73,0.73,0.008],[0.7,0.73,0.008]],\n' +
        '    "triangles": [[0,1,2],[2,3,0],[4,5,6],[6,7,4],[3,2,6],[6,7,3],[5,1,0],[0,4,5],[1,5,6],[6,2,1],[0,3,7],[7,4,0]] },\n' +
        // robot
        '    {"material": {"diffuse": [0.6,0.6,0.6]}, \n' +
        '    "vertices": [[0.7,0.7,0.02],[0.73,0.7,0.02],[0.73,0.73,0.02],[0.7,0.73,0.02],[0.7,0.7,0.008],[0.73,0.7,0.008],[0.73,0.73,0.008],[0.7,0.73,0.008]],\n' +
        '    "triangles": [[0,1,2],[2,3,0],[4,5,6],[6,7,4],[3,2,6],[6,7,3],[5,1,0],[0,4,5],[1,5,6],[6,2,1],[0,3,7],[7,4,0]] },\n' +
        // player's bullet
        '    {"material": {"diffuse": [0.8,0.6,0]}, \n' +
        '    "vertices": [[0.501,0.801,0.0182],[0.509,0.801,0.0182],[0.509,0.809,0.0182],[0.501,0.809,0.0182],[0.501,0.801,0.019],[0.509,0.801,0.019],[0.501,0.809,0.019],[0.501,0.809,0.019]],\n' +
        '    "triangles": [[0,1,2],[2,3,0],[4,5,6],[6,7,4],[3,2,6],[6,7,3],[5,1,0],[0,4,5],[1,5,6],[6,2,1],[0,3,7],[7,4,0]] },\n' +
        // robot's bullet
        '    {"material": {"diffuse": [1.0,1.0,0.5]}, \n' +
        '    "vertices": [[0.711,0.711,0.0182],[0.719,0.711,0.0182],[0.719,0.719,0.0182],[0.711,0.719,0.0182],[0.711,0.711,0.019],[0.719,0.711,0.019],[0.719,0.719,0.019],[0.711,0.719,0.019]],\n' +
        '    "triangles": [[0,1,2],[2,3,0],[4,5,6],[6,7,4],[3,2,6],[6,7,3],[5,1,0],[0,4,5],[1,5,6],[6,2,1],[0,3,7],[7,4,0]] },\n' +
        // robot's bullet
        '    {"material": {"diffuse": [1.0,1.0,0.5]}, \n' +
        '    "vertices": [[0.711,0.711,0.0182],[0.719,0.711,0.0182],[0.719,0.719,0.0182],[0.711,0.719,0.0182],[0.711,0.711,0.019],[0.719,0.711,0.019],[0.719,0.719,0.019],[0.711,0.719,0.019]],\n' +
        '    "triangles": [[0,1,2],[2,3,0],[4,5,6],[6,7,4],[3,2,6],[6,7,3],[5,1,0],[0,4,5],[1,5,6],[6,2,1],[0,3,7],[7,4,0]] },\n' +
        // robot's bullet
        '    {"material": {"diffuse": [1.0,1.0,0.5]}, \n' +
        '    "vertices": [[0.711,0.711,0.0182],[0.719,0.711,0.0182],[0.719,0.719,0.0182],[0.711,0.719,0.0182],[0.711,0.711,0.019],[0.719,0.711,0.019],[0.719,0.719,0.019],[0.711,0.719,0.019]],\n' +
        '    "triangles": [[0,1,2],[2,3,0],[4,5,6],[6,7,4],[3,2,6],[6,7,3],[5,1,0],[0,4,5],[1,5,6],[6,2,1],[0,3,7],[7,4,0]] },\n' +
        // robot's bullet
        '    {"material": {"diffuse": [1.0,1.0,0.5]}, \n' +
        '    "vertices": [[0.711,0.711,0.0182],[0.719,0.711,0.0182],[0.719,0.719,0.0182],[0.711,0.719,0.0182],[0.711,0.711,0.019],[0.719,0.711,0.019],[0.719,0.719,0.019],[0.711,0.719,0.019]],\n' +
        '    "triangles": [[0,1,2],[2,3,0],[4,5,6],[6,7,4],[3,2,6],[6,7,3],[5,1,0],[0,4,5],[1,5,6],[6,2,1],[0,3,7],[7,4,0]] },\n' +
    // right wall
    '    {"material": {"diffuse": [0.0,0.0,0.6]}, \n' +
    '    "vertices": [[0.01, 0.01, 0],[0.03, 0.01, 0],[0.03,0.99,0],[0.01,0.99,0],[0.01, 0.01, 0.02],[0.03, 0.01, 0.02],[0.03,0.99,0.02],[0.01,0.99,0.02]],\n' +
    '    "triangles": [[0,1,2],[2,3,0],[4,5,6],[6,7,4],[3,2,6],[6,7,3],[5,1,0],[0,4,5],[1,5,6],[6,2,1],[0,3,7],[7,4,0]] },\n' +
    // left wall
    '    {"material": {"diffuse": [0.0,0.0,0.6]}, \n' +
    '    "vertices": [[0.97,0.01,0],[0.99,0.01,0],[0.99,0.99,0],[0.97,0.99,0],[0.97,0.01,0.02],[0.99,0.01,0.02],[0.99,0.99,0.02],[0.97,0.99,0.02]],\n' +
    '    "triangles": [[0,1,2],[2,3,0],[4,5,6],[6,7,4],[3,2,6],[6,7,3],[5,1,0],[0,4,5],[1,5,6],[6,2,1],[0,3,7],[7,4,0]] },\n' +
    // top wall
    '    {"material": {"diffuse": [0.0,0.0,0.6]}, \n' +
    '    "vertices": [[0.01,0.97,0],[0.99,0.97,0],[0.99,0.99,0],[0.01,0.99,0],[0.01,0.97,0.02],[0.99,0.97,0.02],[0.99,0.99,0.02],[0.01,0.99,0.02]],\n' +
    '    "triangles": [[0,1,2],[2,3,0],[4,5,6],[6,7,4],[3,2,6],[6,7,3],[5,1,0],[0,4,5],[1,5,6],[6,2,1],[0,3,7],[7,4,0]] },\n' +
    // bottom right wall
    '    {"material": {"diffuse": [0.0,0.0,0.6]}, \n' +
    '    "vertices": [[0.01,0.01,0],[0.3,0.01,0],[0.3,0.03,0],[0.01,0.03,0],[0.01,0.01,0.02],[0.3,0.01,0.02],[0.3,0.03,0.02],[0.01,0.03,0.02]],\n' +
    '    "triangles": [[0,1,2],[2,3,0],[4,5,6],[6,7,4],[3,2,6],[6,7,3],[5,1,0],[0,4,5],[1,5,6],[6,2,1],[0,3,7],[7,4,0]] },\n' +
    // bottom left wall
    '    {"material": {"diffuse": [0.0,0.0,0.6]}, \n' +
    '    "vertices": [[0.7,0.01,0],[0.99,0.01,0],[0.99,0.03,0],[0.7,0.03,0],[0.7,0.01,0.02],[0.99,0.01,0.02],[0.99,0.03,0.02],[0.7,0.03,0.02]],\n' +
    '    "triangles": [[0,1,2],[2,3,0],[4,5,6],[6,7,4],[3,2,6],[6,7,3],[5,1,0],[0,4,5],[1,5,6],[6,2,1],[0,3,7],[7,4,0]] },\n' +
    // middle horizontal wall
    '    {"material": {"diffuse": [0.0,0.0,0.6]}, \n' +
    '    "vertices": [[0.2,0.48,0],[0.8,0.48,0],[0.8,0.52,0],[0.2,0.52,0],[0.2,0.48,0.02],[0.8,0.48,0.02],[0.8,0.52,0.02],[0.2,0.52,0.02]],\n' +
    '    "triangles": [[0,1,2],[2,3,0],[4,5,6],[6,7,4],[3,2,6],[6,7,3],[5,1,0],[0,4,5],[1,5,6],[6,2,1],[0,3,7],[7,4,0]] },\n' +
    // left inner wall
    '    {"material": {"diffuse": [0.0,0.0,0.6]}, \n' +
    '    "vertices": [[0.78,0.35,0],[0.8,0.35,0],[0.8,0.65,0],[0.78,0.65,0],[0.78,0.35,0.02],[0.8,0.35,0.02],[0.8,0.65,0.02],[0.78,0.65,0.02]],\n' +
    '    "triangles": [[0,1,2],[2,3,0],[4,5,6],[6,7,4],[3,2,6],[6,7,3],[5,1,0],[0,4,5],[1,5,6],[6,2,1],[0,3,7],[7,4,0]] },\n' +
    // right inner wall
    '    {"material": {"diffuse": [0.0,0.0,0.6]}, \n' +
    '    "vertices": [[0.2,0.35,0],[0.22,0.35,0],[0.22,0.65,0],[0.2,0.65,0],[0.2,0.35,0.02],[0.22,0.35,0.02],[0.22,0.65,0.02],[0.2,0.65,0.02]],\n' +
    '    "triangles": [[0,1,2],[2,3,0],[4,5,6],[6,7,4],[3,2,6],[6,7,3],[5,1,0],[0,4,5],[1,5,6],[6,2,1],[0,3,7],[7,4,0]] }\n' +
    ']';

    inputTriangles = JSON.parse(data);

    try {
        if (inputTriangles == String.null)
            throw "Unable to load triangles file!";
        else {
            var whichSetVert; // index of vertex in current triangle set
            var whichSetTri; // index of triangle in current triangle set
            var vtxToAdd; // vtx coords to add to the coord array
            var normToAdd; // vtx normal to add to the coord array
            var triToAdd; // tri indices to add to the index array
            var maxCorner = vec3.fromValues(Number.MIN_VALUE,Number.MIN_VALUE,Number.MIN_VALUE); // bbox corner
            var minCorner = vec3.fromValues(Number.MAX_VALUE,Number.MAX_VALUE,Number.MAX_VALUE); // other corner
        
            // process each triangle set to load webgl vertex and triangle buffers
            numTriangleSets = inputTriangles.length; // remember how many tri sets
            for (var whichSet=0; whichSet<numTriangleSets; whichSet++) { // for each tri set
                transformMatrix.push(mat4.create());

                // set up hilighting, modeling translation and rotation
                inputTriangles[whichSet].center = vec3.fromValues(0,0,0);  // center point of tri set
                inputTriangles[whichSet].on = false; // not highlighted
                inputTriangles[whichSet].translation = vec3.fromValues(0,0,0); // no translation
                inputTriangles[whichSet].xAxis = vec3.fromValues(1,0,0); // model X axis
                inputTriangles[whichSet].yAxis = vec3.fromValues(0,1,0); // model Y axis 

                // set up the vertex and normal arrays, define model center and axes
                inputTriangles[whichSet].glVertices = []; // flat coord list for webgl
                var numVerts = inputTriangles[whichSet].vertices.length; // num vertices in tri set
                for (whichSetVert=0; whichSetVert<numVerts; whichSetVert++) { // verts in set
                    vtxToAdd = inputTriangles[whichSet].vertices[whichSetVert]; // get vertex to add
                    inputTriangles[whichSet].glVertices.push(vtxToAdd[0],vtxToAdd[1],vtxToAdd[2]); // put coords in set coord list
                    vec3.max(maxCorner,maxCorner,vtxToAdd); // update world bounding box corner maxima
                    vec3.min(minCorner,minCorner,vtxToAdd); // update world bounding box corner minima
                    vec3.add(inputTriangles[whichSet].center,inputTriangles[whichSet].center,vtxToAdd); // add to ctr sum
                } // end for vertices in set
                vec3.scale(inputTriangles[whichSet].center,inputTriangles[whichSet].center,1/numVerts); // avg ctr sum

                // send the vertex coords and normals to webGL
                vertexBuffers[whichSet] = gl.createBuffer(); // init empty webgl set vertex coord buffer
                gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffers[whichSet]); // activate that buffer
                gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(inputTriangles[whichSet].glVertices),gl.STATIC_DRAW); // data in
            
                // set up the triangle index array, adjusting indices across sets
                inputTriangles[whichSet].glTriangles = []; // flat index list for webgl
                triSetSizes[whichSet] = inputTriangles[whichSet].triangles.length; // number of tris in this set
                for (whichSetTri=0; whichSetTri<triSetSizes[whichSet]; whichSetTri++) {
                    triToAdd = inputTriangles[whichSet].triangles[whichSetTri]; // get tri to add
                    inputTriangles[whichSet].glTriangles.push(triToAdd[0],triToAdd[1],triToAdd[2]); // put indices in set list
                } // end for triangles in set

                // send the triangle indices to webGL
                triangleBuffers.push(gl.createBuffer()); // init empty triangle index buffer
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffers[whichSet]); // activate that buffer
                gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(inputTriangles[whichSet].glTriangles),gl.STATIC_DRAW); // data in

            } // end for each triangle set 
        	var temp = vec3.create();
        	viewDelta = vec3.length(vec3.subtract(temp,maxCorner,minCorner)) / 100; // set global

        } // end if triangle file loaded

        // move robots to different positions
        var temp = mat4.create();
        mat4.fromTranslation(temp,vec3.fromValues(-0.5,-0.6,0));
        mat4.multiply(transformMatrix[2],transformMatrix[2],temp);
        mat4.multiply(transformMatrix[7],transformMatrix[7],temp);

        var temp = mat4.create();
        mat4.fromTranslation(temp,vec3.fromValues(-0.4,0.1,0));
        mat4.multiply(transformMatrix[3],transformMatrix[3],temp);
        mat4.multiply(transformMatrix[8],transformMatrix[8],temp);

        var temp = mat4.create();
        mat4.fromTranslation(temp,vec3.fromValues(-0.1,-0.4,0));
        mat4.multiply(transformMatrix[4],transformMatrix[4],temp);
        mat4.multiply(transformMatrix[9],transformMatrix[9],temp);


    } // end try 
    
    catch(e) {
        console.log(e);
    } // end catch
} // end load models

// setup the webGL shaders
function setupShaders() {
    
    // define vertex shader in essl using es6 template strings
    var vShaderCode = `
        attribute vec3 aVertexPosition; // vertex position
        uniform mat4 upvmMatrix; // the project view model matrix

        void main(void) {
            
            // vertex position
            gl_Position = upvmMatrix * vec4(aVertexPosition, 1.0);
        }
    `;
    
    // define fragment shader in essl using es6 template strings
    var fShaderCode = `
        precision mediump float; // set float to medium precision
        
        // material properties
        uniform vec3 uDiffuse; // the diffuse reflectivity
            
        void main(void) {
            gl_FragColor = vec4(uDiffuse, 1.0); 
        }
    `;
    
    try {
        var fShader = gl.createShader(gl.FRAGMENT_SHADER); // create frag shader
        gl.shaderSource(fShader,fShaderCode); // attach code to shader
        gl.compileShader(fShader); // compile the code for gpu execution

        var vShader = gl.createShader(gl.VERTEX_SHADER); // create vertex shader
        gl.shaderSource(vShader,vShaderCode); // attach code to shader
        gl.compileShader(vShader); // compile the code for gpu execution
            
        if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) { // bad frag shader compile
            throw "error during fragment shader compile: " + gl.getShaderInfoLog(fShader);  
            gl.deleteShader(fShader);
        } else if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) { // bad vertex shader compile
            throw "error during vertex shader compile: " + gl.getShaderInfoLog(vShader);  
            gl.deleteShader(vShader);
        } else { // no compile errors
            var shaderProgram = gl.createProgram(); // create the single shader program
            gl.attachShader(shaderProgram, fShader); // put frag shader in program
            gl.attachShader(shaderProgram, vShader); // put vertex shader in program
            gl.linkProgram(shaderProgram); // link program into gl context

            if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) { // bad program link
                throw "error during shader program linking: " + gl.getProgramInfoLog(shaderProgram);
            } else { // no shader program link errors
                gl.useProgram(shaderProgram); // activate shader program (frag and vert)
                
                // locate and enable vertex attributes
                vPosAttribLoc = gl.getAttribLocation(shaderProgram, "aVertexPosition"); // ptr to vertex pos attrib
                gl.enableVertexAttribArray(vPosAttribLoc); // connect attrib to array
                
                // locate vertex uniforms
                pvmMatrixULoc = gl.getUniformLocation(shaderProgram, "upvmMatrix"); // ptr to pvmmat
                
                // locate fragment uniforms
                colorULoc = gl.getUniformLocation(shaderProgram, "uDiffuse"); // ptr to diffuse

            } // end if no shader program link errors
        } // end if no compile errors
    } // end try 
    
    catch(e) {
        console.log(e);
    } // end catch
} // end setup shaders

function gameOver() {
    var c = document.getElementById("myImageCanvas");
    var ctx = c.getContext("2d");
    var img = new Image();
    img.onload = function () {
        ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, c.width, c.height);
    };
    img.src = "gameover.jpg";
    gl.clearColor(0,0,0,0);
    music.stop();
    gameOverSound.play();
    gameIsOver = true;

}

function reset() {
    textContext.clearRect(0,0,600,600);
    score = 0;
    textContext.fillText('WASD to move', 10, 30);
    textContext.fillText('Space to shoot', 10, 60);
    textContext.fillText('R to reset', 10, 90);
    textContext.fillText('Score: ' + score, 10, 120);
    gl.clearColor(0,0,0,1);


    // reset all transform matrices
    for(var i=0; i<numTriangleSets; i++) {
        mat4.identity(transformMatrix[i]);
    }

    var temp = mat4.create();
    mat4.fromTranslation(temp, vec3.fromValues(-0.5, -0.6, 0));
    mat4.multiply(transformMatrix[2], transformMatrix[2], temp);
    mat4.multiply(transformMatrix[7], transformMatrix[7], temp);

    var temp = mat4.create();
    mat4.fromTranslation(temp, vec3.fromValues(-0.4, 0.1, 0));
    mat4.multiply(transformMatrix[3], transformMatrix[3], temp);
    mat4.multiply(transformMatrix[8], transformMatrix[8], temp);


    var temp = mat4.create();
    mat4.fromTranslation(temp, vec3.fromValues(-0.1, -0.4, 0));
    mat4.multiply(transformMatrix[4], transformMatrix[4], temp);
    mat4.multiply(transformMatrix[9], transformMatrix[9], temp);

    // reset robots and their bullets
    for(var i=0; i<=4; i++) {
        robotDead[i] = false;
        robotBulletShot[i] = false;
    }

    gameIsOver = false;
}

function checkForWin(playerPosition) {
    playerX = playerPosition[0];
    playerY = playerPosition[1];

    if(playerX > 1 || playerX < 0 || playerY > 1 || playerY < 0) {
        var c = document.getElementById("myImageCanvas");
        var ctx = c.getContext("2d");
        var img = new Image();
        img.onload = function () {
            ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, c.width, c.height);
        };
        img.src = "win.jpg";
        gl.clearColor(0,0,0,0);
        gameIsOver = true;
        textContext.clearRect(0,0,600,600);
        score += 500;
        textContext.fillText('WASD to move', 10, 30);
        textContext.fillText('Space to shoot', 10, 60);
        textContext.fillText('R to reset', 10, 90);
        textContext.fillText('Score: ' + score, 10, 120);
    }
}


function checkForCollision(objectCenter, objectWidth, minX, maxX, minY, maxY) {
    var objX = objectCenter[0];
    var objY = objectCenter[1];

    if((objX+(objectWidth/2) >= minX) && (objX-(objectWidth/2)<= maxX) && (objY+(objectWidth/2) >= minY) && (objY-(objectWidth/2) <= maxY)) {
        return true;
    }
    else return false;
}

function checkForObjectCollision(obj1Center, obj1Width, obj2Center, obj2Width) {
    var obj1X = obj1Center[0];
    var obj1Y = obj1Center[1];
    var obj2Xmin = obj2Center[0]-(obj2Width/2);
    var obj2Xmax = obj2Center[0]+(obj2Width/2);
    var obj2Ymin = obj2Center[1]-(obj2Width/2);
    var obj2Ymax = obj2Center[1]+(obj2Width/2);

    if((obj1X+(obj1Width/2) >= obj2Xmin) && (obj1X-(obj1Width/2)<= obj2Xmax) && (obj1Y+(obj1Width/2) >= obj2Ymin) && (obj1Y-(obj1Width/2) <= obj2Ymax)) {
        return true;
    }
    else return false;
}

// the robots will sometimes change to a random direction
window.setInterval(changeRobotDirection, 2000);

function changeRobotDirection() {
    for(var i=0; i<4; i++) {
        var number = Math.floor((Math.random() * 4));
        robotDirection[i] = number;
    }
}



window.setInterval(moveRobots, 90);

function moveRobots() {
    for(var whichTriSet = 1; whichTriSet <= 4; whichTriSet++) {
        if(!robotDead[whichTriSet-1]) {
            var dir = robotDirection[whichTriSet - 1];
            var translationMatrix = mat4.create();
            if (dir == 0) { // move robot left
                mat4.identity(translationMatrix);
                mat4.fromTranslation(translationMatrix, vec3.fromValues(moveAmount, 0, 0));
            } else if (dir == 1) { // move robot right
                mat4.identity(translationMatrix);
                mat4.fromTranslation(translationMatrix, vec3.fromValues(-1 * moveAmount, 0, 0));
            } else if (dir == 2) { // move robot up
                mat4.identity(translationMatrix);
                mat4.fromTranslation(translationMatrix, vec3.fromValues(0, moveAmount, 0));
            } else if (dir == 3) { // move robot down
                mat4.identity(translationMatrix);
                mat4.fromTranslation(translationMatrix, vec3.fromValues(0, -1 * moveAmount, 0));
            }
            mat4.multiply(transformMatrix[whichTriSet], transformMatrix[whichTriSet], translationMatrix);
            if(!robotBulletShot[whichTriSet-1]) {
                mat4.multiply(transformMatrix[whichTriSet+5], transformMatrix[whichTriSet], translationMatrix);
            }

            var robotPosition = vec3.create();
            vec3.transformMat4(robotPosition, inputTriangles[whichTriSet].center, transformMatrix[whichTriSet]);

            // check for collisions with other robots
            var collision = false;
            for (var j = 1; j <= 4; j++) {
                if (j !== whichTriSet) {
                    var otherRobotPosition = vec3.create();
                    vec3.transformMat4(otherRobotPosition, inputTriangles[j].center, transformMatrix[j]);
                    if (checkForObjectCollision(robotPosition, 0.03, otherRobotPosition, 0.03)) {
                        collision = true;
                        break;
                    }
                }
            }

            // if robot hits a wall or another robot, turn it around
            if (collision ||
                checkForCollision(robotPosition, 0.03, 0.97, 0.99, 0.01, 0.99) // left wall
                || checkForCollision(robotPosition, 0.03, 0.01, 0.03, 0.01, 0.99) // right wall
                || checkForCollision(robotPosition, 0.03, 0.01, 0.99, 0.97, 0.99) // top wall
                || checkForCollision(robotPosition, 0.03, 0.01, 0.99, 0.01, 0.03) // bottom wall/opening
                || checkForCollision(robotPosition, 0.03, 0.2, 0.8, 0.48, 0.52) // middle wall
                || checkForCollision(robotPosition, 0.03, 0.2, 0.22, 0.35, 0.65) // inner right wall;
                || checkForCollision(robotPosition, 0.03, 0.78, 0.8, 0.35, 0.65)) // inner left wall;
            {
                if (dir == 0) {
                    robotDirection[whichTriSet - 1] = 1;
                    mat4.identity(translationMatrix);
                    mat4.fromTranslation(translationMatrix, vec3.fromValues(-1 * moveAmount, 0, 0));
                } else if (dir == 1) {
                    robotDirection[whichTriSet - 1] = 0;
                    mat4.identity(translationMatrix);
                    mat4.fromTranslation(translationMatrix, vec3.fromValues(moveAmount, 0, 0));
                } else if (dir == 2) {
                    robotDirection[whichTriSet - 1] = 3;
                    mat4.identity(translationMatrix);
                    mat4.fromTranslation(translationMatrix, vec3.fromValues(0, -1 * moveAmount, 0));
                } else if (dir == 3) {
                    robotDirection[whichTriSet - 1] = 2;
                    mat4.identity(translationMatrix);
                    mat4.fromTranslation(translationMatrix, vec3.fromValues(0, moveAmount, 0));
                }
                mat4.multiply(transformMatrix[whichTriSet], transformMatrix[whichTriSet], translationMatrix);
                if(!robotBulletShot[whichTriSet-1]) {
                    mat4.multiply(transformMatrix[whichTriSet+5], transformMatrix[whichTriSet], translationMatrix);
                }
            }
        }
    }
}

window.setInterval(moveBullet,20);

function moveBullet() {
    if(bulletShot && !gameIsOver) {
        if(bulletDirection == 0) { // left
            var translationMatrix = mat4.create();
            mat4.fromTranslation(translationMatrix, vec3.fromValues(moveAmount, 0, 0));
            mat4.multiply(transformMatrix[5], transformMatrix[5], translationMatrix);
        }
        else if(bulletDirection == 1 ) { // right
            var translationMatrix = mat4.create();
            mat4.fromTranslation(translationMatrix, vec3.fromValues(-1*moveAmount, 0, 0));
            mat4.multiply(transformMatrix[5], transformMatrix[5], translationMatrix);
        }
        else if(bulletDirection == 2) { // up
            var translationMatrix = mat4.create();
            mat4.fromTranslation(translationMatrix, vec3.fromValues(0, moveAmount, 0));
            mat4.multiply(transformMatrix[5], transformMatrix[5], translationMatrix);
        }
        else if(bulletDirection == 3) { // down
            var translationMatrix = mat4.create();
            mat4.fromTranslation(translationMatrix, vec3.fromValues(0, -1*moveAmount, 0));
            mat4.multiply(transformMatrix[5], transformMatrix[5], translationMatrix);
        }

        // check for collision with robots
        var bulletLocation = vec3.create();
        vec3.transformMat4(bulletLocation, inputTriangles[5].center, transformMatrix[5]);
        for(var robot=1; robot<=4; robot++) {
            var robotLocation = vec3.create();
            vec3.transformMat4(robotLocation, inputTriangles[robot].center, transformMatrix[robot]);
            if(checkForObjectCollision(bulletLocation, 0.01, robotLocation, 0.03)) {
                bulletShot = false;
                robotDead[robot-1] = true;
                mat4.multiply(transformMatrix[robot], transformMatrix[robot], mat4.fromTranslation(0,0,-10)); // hide robot behind eye
                if(!robotBulletShot[robot-1]) {
                    mat4.multiply(transformMatrix[robot + 5], transformMatrix[robot + 5], mat4.fromTranslation(0, 0, -10)); // hide robot's bullet behind eye
                }
                // hide bullet inside player
                mat4.copy(transformMatrix[5], transformMatrix[0]);
                explosionNoise.play();
                textContext.clearRect(0,0,600,600);
                score += 100;
                textContext.fillText('WASD to move', 10, 30);
                textContext.fillText('Space to shoot', 10, 60);
                textContext.fillText('R to reset', 10, 90);
                textContext.fillText('Score: ' + score, 10, 120);
            }
        }
        // check for collision with wall
        if(checkForCollision(bulletLocation, 0.008, 0.97, 0.99, 0.01, 0.99) // left wall
            || checkForCollision(bulletLocation, 0.008, 0.01, 0.03, 0.01, 0.99) // right wall
            || checkForCollision(bulletLocation, 0.008,0.01, 0.99, 0.97, 0.99) // top wall
            || checkForCollision(bulletLocation, 0.008,0.01, 0.99, 0.01, 0.03) // bottom wall/opening
            || checkForCollision(bulletLocation, 0.008,0.2, 0.8, 0.48, 0.52) // middle wall
            || checkForCollision(bulletLocation, 0.008,0.2, 0.22, 0.35, 0.65) // inner right wall;
            || checkForCollision(bulletLocation, 0.008,0.78, 0.8, 0.35, 0.65)) // inner left wall//
        {
            bulletShot = false;
            // hide bullet inside player
            mat4.copy(transformMatrix[5], transformMatrix[0]);
        }
    }
}

function startRobotShooting(robot) {
    window.setInterval(makeRobotShoot, 100, robot);
}

// delay so the robots don't all start shooting at exactly the same time
setTimeout(startRobotShooting, 0, 1);
setTimeout(startRobotShooting, 1000, 2);
setTimeout(startRobotShooting, 2000, 3);
setTimeout(startRobotShooting, 3000, 4);

function makeRobotShoot(robotIndex) {
    if(!robotDead[robotIndex-1] && !robotBulletShot[robotIndex-1]) {
        var playerLocation = vec3.create();
        vec3.transformMat4(playerLocation, inputTriangles[0].center, transformMatrix[0]);
        var robotLocation = vec3.create();
        vec3.transformMat4(robotLocation, inputTriangles[robotIndex].center, transformMatrix[robotIndex]);

        if(Math.abs(playerLocation[0]-robotLocation[0]) >= Math.abs(playerLocation[1]-robotLocation[1])) {
            // robot is closer to player horizontally than vertically
            if (playerLocation[0] < robotLocation[0]) {
                robotBulletDirection[robotIndex - 1] = 1; // shoot right
            } else {
                robotBulletDirection[robotIndex - 1] = 0; // shoot left
            }
        }
        else {
            if (playerLocation[1] > robotLocation[1]) {
                robotBulletDirection[robotIndex - 1] = 2; // shoot up
            } else {
                robotBulletDirection[robotIndex - 1] = 3; // shoot down
            }
        }
        //robotBulletDirection[robotIndex-1] = robotDirection[robotIndex-1];
        robotBulletShot[robotIndex-1] = true;
    }
}

window.setInterval(moveRobotBullets,40);
function moveRobotBullets() {
    if (!gameIsOver) {
        for (var whichTriSet = 6; whichTriSet <= 9; whichTriSet++) {
            if (robotBulletShot[whichTriSet - 6]) {
                var translationMatrix = mat4.create();
                if (robotBulletDirection[whichTriSet - 6] == 0) { // left
                    mat4.fromTranslation(translationMatrix, vec3.fromValues(moveAmount, 0, 0));
                } else if (robotBulletDirection[whichTriSet - 6] == 1) { // right
                    mat4.identity(translationMatrix);
                    mat4.fromTranslation(translationMatrix, vec3.fromValues(-1 * moveAmount, 0, 0));
                } else if (robotBulletDirection[whichTriSet - 6] == 2) { // up
                    mat4.identity(translationMatrix);
                    mat4.fromTranslation(translationMatrix, vec3.fromValues(0, moveAmount, 0));
                } else if (robotBulletDirection[whichTriSet - 6] == 3) { // down
                    mat4.identity(translationMatrix);
                    mat4.fromTranslation(translationMatrix, vec3.fromValues(0, -1 * moveAmount, 0));
                }
                mat4.multiply(transformMatrix[whichTriSet], transformMatrix[whichTriSet], translationMatrix);

                var bulletLocation = vec3.create();
                vec3.transformMat4(bulletLocation, inputTriangles[whichTriSet].center, transformMatrix[whichTriSet]);

                // check for collision with player
                var playerLocation = vec3.create();
                vec3.transformMat4(playerLocation, inputTriangles[0].center, transformMatrix[0]);
                if (checkForObjectCollision(playerLocation, 0.01, bulletLocation, 0.008)) {
                    gameOver();
                }

                // check for collision with robots
                for (var robot = 1; robot <= 4; robot++) {
                    if (robot !== whichTriSet - 5) {
                        var robotLocation = vec3.create();
                        vec3.transformMat4(robotLocation, inputTriangles[robot].center, transformMatrix[robot]);
                        if (checkForObjectCollision(bulletLocation, 0.01, robotLocation, 0.03)) {
                            robotBulletShot[whichTriSet - 6] = false;
                            robotDead[robot - 1] = true;
                            mat4.multiply(transformMatrix[robot], transformMatrix[robot], mat4.fromTranslation(0, 0, -10)); // hide robot behind eye
                            if (!robotBulletShot[robot - 1]) {
                                mat4.multiply(transformMatrix[robot + 5], transformMatrix[robot + 5], mat4.fromTranslation(0, 0, -10)); // hide dead robot's bullet behind eye
                            }
                            // hide bullet inside robot who shot it
                            mat4.copy(transformMatrix[whichTriSet], transformMatrix[whichTriSet - 5]);
                            explosionNoise.play();
                            textContext.clearRect(0, 0, 600, 600);
                            score += 100;
                            textContext.fillText('WASD to move', 10, 30);
                            textContext.fillText('Space to shoot', 10, 60);
                            textContext.fillText('R to reset', 10, 90);
                            textContext.fillText('Score: ' + score, 10, 120);
                        }
                    }
                }
                // check for collision with wall
                if (checkForCollision(bulletLocation, 0.008, 0.97, 0.99, 0.01, 0.99) // left wall
                    || checkForCollision(bulletLocation, 0.008, 0.01, 0.03, 0.01, 0.99) // right wall
                    || checkForCollision(bulletLocation, 0.008, 0.01, 0.99, 0.97, 0.99) // top wall
                    || checkForCollision(bulletLocation, 0.008, 0.01, 0.99, 0.01, 0.03) // bottom wall/opening
                    || checkForCollision(bulletLocation, 0.008, 0.2, 0.8, 0.48, 0.52) // middle wall
                    || checkForCollision(bulletLocation, 0.008, 0.2, 0.22, 0.35, 0.65) // inner right wall;
                    || checkForCollision(bulletLocation, 0.008, 0.78, 0.8, 0.35, 0.65)) // inner left wall//
                {
                    robotBulletShot[whichTriSet - 6] = false;
                    // hide bullet inside robot who shot it
                    mat4.copy(transformMatrix[whichTriSet], transformMatrix[whichTriSet - 5]);
                }
            }
        }
    }
}

// render the loaded model
function renderModels() {
    
    // var hMatrix = mat4.create(); // handedness matrix
    var pMatrix = mat4.create(); // projection matrix
    var vMatrix = mat4.create(); // view matrix
    var pvMatrix = mat4.create(); // proj * view matrices
    var pvmMatrix = mat4.create(); // proj * view * model matrices
    
    window.requestAnimationFrame(renderModels); // set up frame render callback
    
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // clear frame/depth buffers

    if (!gameIsOver) {
        var playerPosition = vec3.create();
        vec3.transformMat4(playerPosition, inputTriangles[0].center, transformMatrix[0]);
        checkForWin(playerPosition);

        // check for collision with wall
        if( checkForCollision(playerPosition, 0.01, 0.97, 0.99, 0.01, 0.99) // left wall
        || checkForCollision(playerPosition, 0.01,0.01, 0.03, 0.01, 0.99) // right wall
        || checkForCollision(playerPosition, 0.01,0.01, 0.99, 0.97, 0.99) // top wall
        || checkForCollision(playerPosition, 0.01,0.01, 0.3, 0.01, 0.03) // bottom right wall
        || checkForCollision(playerPosition, 0.01,0.7, 0.99, 0.01, 0.03) // bottom left wall
        || checkForCollision(playerPosition, 0.01,0.2, 0.8, 0.48, 0.52) // middle wall
        || checkForCollision(playerPosition, 0.01,0.2, 0.22, 0.35, 0.65) // inner right wall;
        || checkForCollision(playerPosition, 0.01,0.78, 0.8, 0.35, 0.65) // inner left wall;
    ) { gameOver(); }

        // check for collision with robot
        for(var robotIndex=1; robotIndex <=4; robotIndex++) {
            var robotPosition = vec3.create();
            vec3.transformMat4(robotPosition,inputTriangles[robotIndex].center,transformMatrix[robotIndex]);
            if(checkForObjectCollision(playerPosition, 0.01, robotPosition, 0.03)) {
                gameOver();
            }
        }
        if (isPerspectiveProjection) {
            mat4.perspective(pMatrix, 0.5 * Math.PI, 1, 0.01, 10); // create projection matrix
        }
        else
            mat4.ortho(pMatrix, -0.5, .50, -0.50, 0.50, 0.1, 10);
        mat4.lookAt(vMatrix, Eye, Center, Up); // create view matrix
        mat4.multiply(pvMatrix, pvMatrix, pMatrix); // projection
        mat4.multiply(pvMatrix, pvMatrix, vMatrix); // projection * view

        // render each triangle set
        var currSet; // the tri set and its material properties
        for (var whichTriSet = 0; whichTriSet < numTriangleSets; whichTriSet++) {
            currSet = inputTriangles[whichTriSet];

            mMatrix = transformMatrix[whichTriSet];
            mat4.multiply(pvmMatrix, pvMatrix, mMatrix); // project * view * model
            gl.uniformMatrix4fv(pvmMatrixULoc, false, pvmMatrix); // pass in the hpvm matrix

            // reflectivity: feed to the fragment shader
            gl.uniform3fv(colorULoc, currSet.material.diffuse); // pass in the diffuse reflectivity
            // vertex buffer: activate and feed into vertex shader
            gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffers[whichTriSet]); // activate
            gl.vertexAttribPointer(vPosAttribLoc, 3, gl.FLOAT, false, 0, 0); // feed

            // triangle buffer: activate and render
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffers[whichTriSet]); // activate
            gl.drawElements(gl.TRIANGLES, 3 * triSetSizes[whichTriSet], gl.UNSIGNED_SHORT, 0); // render

        } // end for each triangle set
    }
} // end render model

function sound(src) {
    this.sound = document.createElement("audio");
    this.sound.src = src;
    this.sound.setAttribute("preload", "auto");
    this.sound.setAttribute("controls", "none");
    this.sound.style.display = "none";
    document.body.appendChild(this.sound);
    this.play = function(){
        this.sound.play();
    }
    this.stop = function(){
        this.sound.pause();
    }
}

/* MAIN -- HERE is where execution begins after window load */

function main() {
    gameOverSound = new sound("gameover.wav");
    music = new sound("music.mp3");
    shootNoise = new sound("shootnoise.wav");
    explosionNoise = new sound("explosion.wav");
  setupWebGL(); // set up the webGL environment
  loadModels(); // load in the models from tri file
  setupShaders(); // setup the webGL shaders
  renderModels(); // draw the triangles using webGL
  
} // end main
