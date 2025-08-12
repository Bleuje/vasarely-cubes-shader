#version 330 core
out vec4 fragColor;

uniform vec2 iResolution; // in pixels
uniform float tt;         // in [0…1] loop
uniform int   uQuality;     // 0=off(1spp), 1=4spp, 2=8spp, 3=16spp
uniform float uRaySpreadPx; // sampling radius in *pixels* (e.g. 0.85)

float t,t2;

const float loopDuration = 3.4;
const float L = 38.0;

const float HALF_PI = 1.57079632679;
const float PI = 2. * HALF_PI;
const float CAM_ROT_X = 0.608 * HALF_PI;
const float CAM_ROT_Z = 0.5 * HALF_PI;

mat3 rotX(float a){
    float c = cos(a), s = sin(a);
    return mat3(1,0,0, 0,c,-s, 0,s,c);
}
mat3 rotY(float a){
    float c = cos(a), s = sin(a);
    return mat3(c,0,s, 0,1,0, -s,0,c);
}
mat3 rotZ(float a){
    float c = cos(-a), s = sin(-a);
    return mat3(c,-s,0, s,c,0, 0,0,1);
}

float bounce(float p) {
    p = mod(mod(p, 1.0) + 1.0, 1.0); // wrap to [0,1)
    float g = 2.0;
    if (p > 0.5) {
        p = 1.0 - p; // mirror into [0,0.5]
    }
    return 1.0 - pow(1.0 - 2.0 * p, g);
}

struct MapData {
    float dist;
    vec3 localPos;
    vec2 localFaceUV;
    int type;
    int type2;
};

MapData mdMin(MapData data1,MapData data2)
{
    if(data1.dist<data2.dist)
    {
        return data1;
    }
    else
    {
        return data2;
    }
}

MapData sdBox(vec3 p, vec3 b){
    MapData ret;
    ret.localPos = p;
    
    vec3 q = abs(p) - b;
    ret.dist = length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - 0.*0.25*L*pow(bounce(t2),4.0);
    //ret.dist -= 0.05*L;
    
    vec3 normal = vec3(0.0);
    if(q.x > q.y && q.x > q.z) normal.x = sign(p.x);
    else if(q.y > q.z) normal.y = sign(p.y);
    else normal.z = sign(p.z);
    
    vec2 uv;
    if(normal.x != 0.0){
        uv = p.yz / (2.0 * b.yz) + 0.5;
        if(normal.x < 0.0) uv.x = 1.0 - uv.x;
        ret.type = 0;
    } else if(normal.y != 0.0){
        uv = p.xz / (2.0 * b.xz) + 0.5;
        if(normal.y < 0.0) uv.y = 1.0 - uv.y;
        ret.type = 1;
    } else {
        uv = p.xy / (2.0 * b.xy) + 0.5;
        if(normal.z < 0.0) uv.x = 1.0 - uv.x;
        ret.type = 2;
    }
    ret.localFaceUV = uv;
    return ret;
}

vec3 procBasis(vec3 v) { return vec3(v.x, -v.y, -v.z); }

MapData cubePart(in vec3 p)
{
    p.y -= -L/2.0;

    p -= vec3(0.,-L*0.5,0.5*L);
    
    float angle = 0.65*HALF_PI*bounce(t2);
    
    p = rotX(-angle) * p;
    
    p -= vec3(0.,L/2.0,-L/2.0);
    
    if(t>=0.5) p = rotY(HALF_PI) * p;
    
    MapData ret = sdBox(p, vec3(0.5*L));
    ret.type2 = 0;
    
    return ret;
}

MapData map(in vec3 pw){
    vec3 p = procBasis(pw);
    
    if(t>=0.5) p.y *= -1.0;
    if(t>=0.5) p = rotZ(HALF_PI*2.0*0.6666) * p;

    p = rotZ(-CAM_ROT_Z) * (rotX(-CAM_ROT_X) * p);
    
    MapData cube = cubePart(p);
    
    float mv = bounce(t2);
    
    vec3 q = p;
    
    p = rotY(HALF_PI) * p;
    p.z -= -L*0.5;
    p = rotZ(PI) * p;
    p.xy -= vec2(-L*mv,-L/2.0);
    
    MapData wall1 = sdBox(p, vec3(0.5*L,0.5*L,0.001*L));
    wall1.type2 = 1;
    
    p = q;
    
    p -= vec3(0.,L/2.0,L/2.0);
    
    p = rotZ(2.0*HALF_PI) * p;
    
    p.xy -= vec2(-L*mv,0.);
    
    MapData wall2 = sdBox(p, vec3(0.5*L,0.5*L,0.001*L));
    wall2.type2 = 1;

    MapData preRet = mdMin(mdMin(wall1,wall2),cube);
    
    //preRet.dist += 1.5*sin(0.1*pw.x + 0.33*pw.y + 0.15*pw.z + tt);

    return preRet;
}


vec3 getNormal(vec3 p){
    float h = 0.0005;
    vec2 k = vec2(1.0, -1.0);
    return normalize(
        k.xyy * map(p + k.xyy * h).dist +
        k.yyx * map(p + k.yyx * h).dist +
        k.yxy * map(p + k.yxy * h).dist +
        k.xxx * map(p + k.xxx * h).dist
    );
}

vec4 render(vec2 uv, float time){
    //if(length(uv)<0.01) return vec4(1.0,0.,0.,1.);
    t = mod(time + 10.0, 1.0);
    t2 = mod(2.0*t,1.0);
    vec2 uv2 = uv * 150.0;
    vec3 ro = vec3(uv2, 500.0);
    vec3 rd = vec3(0.0, 0.0, -1.0);
    ro.z -= uv2.y;
    float dist = 0.0;
    bool hit = false;
    vec3 pos;
    for(int i=0;i<150;i++){
        pos = ro + rd * dist;
        float d = map(pos).dist*0.5;
        if(d < 0.001){
            hit = true;
            break;
        }
        dist += d;
        if(dist > 800.0) break;
    }
    MapData md = map(pos);
    vec3 n = getNormal(pos);
    if(hit){
        vec2 luv = (md.localFaceUV - vec2(0.5))/0.5;
        float d = max(abs(luv.x),abs(luv.y));
        float d2 = max(abs(10.0*luv.x),abs(0.92*luv.y));
        float d3 = max(abs(10.0*luv.y),abs(0.92*luv.x));
        float sn = sin(23.0*d-1.0);
        float br = smoothstep(0.8,0.95,sn) - smoothstep(0.85,0.9,min(d2,d3));
        br = max(0.,br);
        float sub1 = smoothstep(0.79,0.81,abs(luv.x));
        float sub2 = smoothstep(0.79,0.81,abs(luv.y));
        float activator = pow(1-t2,10.0);
        float br2 = min(sub1,sub2) - smoothstep(0.93,0.98,d) + 0.75*smoothstep(0.93,0.95,d);
        br = clamp(br+br2,0.,1.);
        //float br = smoothstep(0.9,0.95,d);
        vec3 col = vec3(br);
        
        if(md.type2 ==1 && md.type != 2) col = vec3(0.);
        
        return vec4(col,1.0);
    }
    
    return vec4(vec3(0.),1.0);
}

// hash for per-pixel pattern rotation (stable in time)
float hash12(vec2 p){
    p = fract(p * vec2(123.34, 345.45));
    p += dot(p, p + 34.345);
    return fract(p.x * p.y);
}

vec2 rot2(vec2 v, float a){
    float c = cos(a), s = sin(a);
    return vec2(c*v.x - s*v.y, s*v.x + c*v.y);
}

// Vogel (golden-angle) disk sample in *pixel* units, radius in pixels
vec2 closeRayOffset(int i, int N, vec2 pixel, float radiusPx){
    // golden angle
    const float GA = 2.399963229728653f;
    float seed = hash12(pixel);                 // per-pixel random rotation
    float a = (float(i) + 0.5) * GA + seed*6.2831853;
    float r = sqrt((float(i) + 0.5) / float(N)) * radiusPx;
    return rot2(vec2(cos(a), sin(a)) * r, seed*6.2831853);
}

// Map quality → spp
int qualityToSPP(int q){
    if (q <= 0) return 1;
    if (q == 1) return 4;
    if (q == 2) return 8;
    return 16; // q >= 3
}

void main() {
    float animationTime = mod(tt+0.25,1.0);

    // Base uv
    vec2 uvBase = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;

    int  spp = qualityToSPP(uQuality);
    vec3 acc = vec3(0.0);

    // Convert pixel offsets → uv: 1 px == 1 / iResolution.y in your uv convention
    for (int i = 0; i < 16; ++i) {          // hard cap; break at spp
        if (i >= spp) break;
        vec2 offPx = closeRayOffset(i, spp, gl_FragCoord.xy, uRaySpreadPx);
        vec2 uv    = uvBase + offPx / iResolution.y;
        acc       += render(uv, animationTime - 0.09*length(uvBase)-0*0.04*uvBase.x).rgb;
    }

    vec3 col = acc / float(spp);
    fragColor = vec4(col, 1.0);
}


// ffmpeg -framerate 50 -i bin/data/frames/frame_%04d.png -c:v libx264 -pix_fmt yuv420p -crf 18 -preset slow outloop13.mp4
