#include "ofApp.h"

//--------------------------------------------------------------
void ofApp::setup()
{
    ofSetFrameRate(FRAME_RATE);

    shader.load("shaders/shader.vert", "shaders/shader.frag");
}

//--------------------------------------------------------------
void ofApp::update()
{
    shader.begin();
    shader.setUniform2f("iResolution", ofGetWidth(), ofGetHeight());
    shader.setUniform1f("iTime", ofGetElapsedTimef());

    float tNorm;
    if (isExporting)
    {
        tNorm = float(currentFrame) / float(numFrames);
    }
    else
    {
        tNorm = std::fmod(2.0f * float(ofGetMouseX()) / ofGetWidth(), 1.0f);
    }
    shader.setUniform1f("tt", tNorm);

    shader.setUniform1f("c", float(ofGetMouseY()) / ofGetWidth());
    shader.setUniform2f("center",
                        ofMap(ofGetMouseX(), 0, ofGetWidth(), -1, 1),
                        ofMap(ofGetMouseY(), 0, ofGetHeight(), 1, -1));
    shader.end();

    std::stringstream strm;
    strm << "fps: " << ofGetFrameRate() << " / " << ofGetElapsedTimef();
    ofSetWindowTitle(strm.str());
}

//--------------------------------------------------------------
void ofApp::draw()
{
    shader.begin();
    ofDrawRectangle(0, 0, ofGetWidth(), ofGetHeight());
    shader.end();

    if (isExporting)
    {
        std::stringstream ss;
        ss << "frames/frame_" << std::setw(4) << std::setfill('0') << currentFrame << ".png";
        ofSaveScreen(ss.str());

        std::cout << "frame " << currentFrame+1 << " / " << numFrames << std::endl;

        currentFrame++;
        if (currentFrame >= numFrames)
        {
            isExporting = false;
            std::cout << "Export complete!" << std::endl;
        }
    }
}

//--------------------------------------------------------------
void ofApp::keyPressed(int key)
{
    if (key == ' ')
    {
        isExporting = true;
        currentFrame = 0;
        std::cout << "Export started." << std::endl;
    }
}

//--------------------------------------------------------------
void ofApp::keyReleased(int key)
{
}

//--------------------------------------------------------------
void ofApp::mouseMoved(int x, int y)
{
}

//--------------------------------------------------------------
void ofApp::mouseDragged(int x, int y, int button)
{
}

//--------------------------------------------------------------
void ofApp::mousePressed(int x, int y, int button)
{
    std::cout << double(1.0 * ofGetMouseY() / ofGetHeight()) << std::endl;
}

//--------------------------------------------------------------
void ofApp::mouseReleased(int x, int y, int button)
{
}

//--------------------------------------------------------------
void ofApp::mouseEntered(int x, int y)
{
}

//--------------------------------------------------------------
void ofApp::mouseExited(int x, int y)
{
}

//--------------------------------------------------------------
void ofApp::windowResized(int w, int h)
{
}

//--------------------------------------------------------------
void ofApp::gotMessage(ofMessage msg)
{
}

//--------------------------------------------------------------
void ofApp::dragEvent(ofDragInfo dragInfo)
{
}
