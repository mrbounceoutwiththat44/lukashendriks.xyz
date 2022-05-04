let lCursor;

function preload() {
    lCursor = loadImage("images/TransparentL.png");
}


function draw() {



    imageMode(CENTER);
    image(lCursor, mouseX, mouseY, 100, 100);
    noCursor();
    textSize(100);

}