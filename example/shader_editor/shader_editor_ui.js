function doShaderChangeListener(){
    if (window.vertexShaderSession && window.fragmentShaderSession){
        var vsNew = window.vertexShaderSession.getValue();
        var fsNew = window.fragmentShaderSession.getValue();
        if (vsNew !== vs || fsNew !== fs){
            vs = vsNew;
            fs = fsNew;
            updateShader();
        }
    }
}

function shaderChangeListener(){
    doShaderChangeListener();
    setTimeout(shaderChangeListener,2000);
}

function resetShader(){
    if (confirm("Create a new shader?")){
        textures = [];
        currentTextures = document.getElementById('currentTextures');
        while (currentTextures.options.length>0){
            currentTextures.remove(0);
        }
        document.getElementById('textureDetails').style.display = 'none';
        document.getElementById('texturePreview').style.display = 'none';
        window.vertexShaderSession.setValue(document.getElementById("vertexShader").backup);
        window.fragmentShaderSession.setValue(document.getElementById("fragmentShader").backup);
        doShaderChangeListener();
    }
}

function getChildrenValueVector(elementName){
    var elem = document.getElementById(elementName),
        array = [],
        i,
        count = 0;
    for (i=0;i<elem.children.length;i++){
        if (elem.children[i].nodeName === 'INPUT'){
            array[count++] = Number(elem.children[i].value);
        }
    }
    return array;
}

function setChildrenValueVector(elementName,vector){
    var elem = document.getElementById(elementName),
        i,
        count = 0,
        childElem;
    for (i=0;i<elem.children.length;i++){
        childElem =elem.children[i];
        if (childElem.nodeName === 'INPUT'){
            childElem.value = vector[count++];
            invokeClickEvent(childElem);
        }
    }
}

function invokeClickEvent(elem){
    var evt = document.createEvent("MouseEvents");
    evt.initMouseEvent("click", true, true, window,
    0, 0, 0, 0, 0, false, false, false, false, 0, null);
    elem.dispatchEvent(evt);
}


function getRadioValue(elementName){
    var elem = document.getElementById(elementName),
        i,
        count = 0,
        childElem;
    for (i=0;i<elem.children.length;i++){
        childElem =elem.children[i];
        if (childElem.nodeName === 'INPUT'){
            if (childElem.checked){
                return childElem.value;
            }
        }
    }
}

function setRadioValue(elementName,value){
    var  elem = document.getElementById(elementName),
        checked = null;
    for (i=0;i<elem.children.length;i++){
        childElem =elem.children[i];
        if (childElem.nodeName === 'INPUT'){
            childElem.checked = childElem.value === value;
            if (childElem.checked){
                invokeClickEvent(childElem);
            }
        }
    }
}

function getTextureData(){
    return JSON.stringify(textures);
}

function setTextureData(textureData){
    var texturesParsed = JSON.parse(textureData),
        currentTextures = document.getElementById('currentTextures');
    for (var i=0;i<texturesParsed.length;i++){
        (function scope(){
            var texture = new KICK.texture.Texture(engine,texturesParsed[i]),
                imageSrc = texture.dataURI,
                image = new Image(),
                newOption = document.createElement('option');
            newOption.text = imageSrc.length<40?imageSrc:imageSrc.substr(0,40)+'...';
            newOption.value = currentTextures.options.length;
            currentTextures.add(newOption);
            textures.push(texture);
            image.onload = function() {
                texture.setImage(image, imageSrc);
            };
            image.src = imageSrc;
        })();
    }
}

function getSettingsData(){
    return {
        meshsetting: getRadioValue('meshsetting'),
        rotatemesh: getRadioValue('rotatemesh'),
        lightpos: getChildrenValueVector('lightpos'),
        lightrot: getChildrenValueVector('lightrot'),
        lightcolor: getChildrenValueVector('lightcolor'),
        lightintensity: document.getElementById('lightintensity').value
    };
}

function setSettingsData(settingsData){
    setRadioValue('meshsetting',settingsData.meshsetting);
    setRadioValue('rotatemesh',settingsData.rotatemesh);
    var lightintensity = document.getElementById('lightintensity');
    setChildrenValueVector('lightpos',settingsData.lightpos);
    setChildrenValueVector('lightrot',settingsData.lightrot);
    setChildrenValueVector('lightcolor',settingsData.lightcolor);
    lightintensity.value = settingsData.lightintensity;
    invokeClickEvent(lightintensity);
}

function getData(){
    return {
        vertexShader: vs,
        fragmentShader:fs,
        textureData: getTextureData(),
        settingsData: getSettingsData()
    };
}

function addTexture(){
    var t = new KICK.texture.Texture(engine),
        currentTextures = document.getElementById('currentTextures'),
        newOption = document.createElement('option');
    newOption.text = "New texture #"+currentTextures.options.length;
    newOption.value = currentTextures.options.length;
    currentTextures.add(newOption);
    currentTextures.selectedIndex = currentTextures.options.length-1;
    textures.push(t);
    invokeClickEvent(currentTextures);
}

function removeTexture(){
    var currentTextures = document.getElementById('currentTextures'),
        selectedIndex = currentTextures.selectedIndex;
    if (selectedIndex === -1){
        return;
    }
    currentTextures.remove(selectedIndex);
    textures.splice(selectedIndex,1);
}

function textureSelected(){
    var currentTextures = document.getElementById('currentTextures'),
        selectedIndex = currentTextures.selectedIndex,
        c = KICK.core.Constants;
    if (selectedIndex<0){
        return;
    }
    var texture = textures[selectedIndex];
    document.getElementById('textureSrc').value = texture.dataURI;
    document.getElementById('texturePreviewImg').src = texture.dataURI;

    setSelectedGLConstant('textureFormat',texture.internalFormal);
    document.getElementById('mipMapping').checked = texture.generateMipmaps;
    document.getElementById('autoScaleImage').checked = texture.autoScaleImage;
    setSelectedGLConstant('textureMode',texture.wrapS);
    document.getElementById('flipY').checked = texture.flipY;
    setSelectedGLConstant('minFilter',texture.minFilter);
    setSelectedGLConstant('magFilter',texture.magFilter);

    document.getElementById('textureDetails').style.display = 'block';
    document.getElementById('texturePreview').style.display = 'block';
}

function textureUpdate(){
    var currentTextures = document.getElementById('currentTextures'),
        selectedIndex = currentTextures.selectedIndex,
        imgSrc = document.getElementById('textureSrc').value;
    if (selectedIndex<0){
        return;
    }
    var texture = textures[selectedIndex];
    texture.internalFormal = getSelectedGLConstant('textureFormat');
    texture.generateMipmaps = document.getElementById('mipMapping').checked;
    texture.autoScaleImage = document.getElementById('autoScaleImage').checked;
    texture.wrapS = getSelectedGLConstant('textureMode');
    texture.wrapT = texture.wrapS;
    texture.flipY = document.getElementById('flipY').checked;
    texture.minFilter = getSelectedGLConstant('minFilter');
    texture.magFilter = getSelectedGLConstant('magFilter');
    var image = new Image();
    image.onload = function() {
        texture.setImage(image, imgSrc);
    };
    image.src = imgSrc;
    document.getElementById('texturePreviewImg').src = imgSrc;
    if (imgSrc.length>0){
        currentTextures.options[selectedIndex].text = imgSrc.length<40?imgSrc:imgSrc.substr(0,40)+'...';
    }
}

function trySave(){
    var thisObj = this,
        innerHtml = this.innerHTML;
    if (this.isSaving) {
        return;
    }
    this.isSaving = true;
    this.innerHTML = 'Saving ...';
    var jsonData = getData();
    localStorage.setItem("shader",JSON.stringify(jsonData));
    this.innerHTML = 'Save ok';

    setTimeout(function(){
        thisObj.innerHTML=innerHtml;
        thisObj.isSaving = false;
    },3000);
}

function tryLoadShaderFromLocalStorage(){
    // take backup of vertexShader and fragmentShader
    document.getElementById("vertexShader").backup = document.getElementById("vertexShader").value;
    document.getElementById("fragmentShader").backup = document.getElementById("fragmentShader").value;
    var shader = localStorage.getItem("shader");
    if (shader){
        shader = JSON.parse(shader);
        document.getElementById("vertexShader").value = shader.vertexShader;
        document.getElementById("fragmentShader").value = shader.fragmentShader;
    }
}

function tryLoadConfigFromLocalStorage(){
    try{
        var shader = localStorage.getItem("shader");
        if (shader){
            shader = JSON.parse(shader);
            setSettingsData(shader.settingsData);
            if (shader.textureData){
                setTextureData(shader.textureData);
            }
        }
    } catch (e){
        console.log(e);
    }
}

/**
 * Add gl attribute to option elements of a select
 * @param elementId select element to be modified
 * @param constants array of GL constants
 */
function addGLConstantToSelect(elementId, constants){
    var elem = document.getElementById(elementId),
        options = elem.options;

    if (options.length !== constants.length){
        throw new Error("options.length !== constants.length");
    }
    for (var i=0;i<options.length;i++){
        options[i].gl = constants[i];
    }
}

function getSelectedGLConstant(elementId){
    var elem = document.getElementById(elementId),
        options = elem.options,
        selectedIndex = elem.selectedIndex;
    if (selectedIndex===-1){
        return null;
    }
    return options[elem.selectedIndex].gl;
}

function setSelectedGLConstant(elementId, glConst){
    var elem = document.getElementById(elementId),
            options = elem.options;
    for (var i=0;i<options.length;i++){
        if (options[i].gl === glConst){
            elem.selectedIndex = i;
            return true;
        }
    }
    return false;
}


YUI().use('tabview','console', function(Y) {
    var c = KICK.core.Constants;
    var tabview = new Y.TabView({
        srcNode: '#editorSection'
    });

    tabview.render();
    window.tabview = tabview;

    //create the console
    var r = new Y.Console({
        newestOnTop : false,
        //style: 'block',
        width: 600,
        height: 200,
        consoleLimit:10
    });

    r.render('#logger');
    window.log = r;
    tryLoadShaderFromLocalStorage();
    initKick();

    var initEditor = function(id){
        var editor = ace.edit(id);
        editor.setTheme("ace/theme/twilight");
        var GLSL_ES_Mode = require("ace/mode/glsl_es").Mode;
        var EditSession = require('ace/edit_session').EditSession;
        window.vertexShaderSession = new EditSession( document.getElementById("vertexShader").value );
        window.vertexShaderSession.setMode(new GLSL_ES_Mode());
        editor.setSession(window.vertexShaderSession);
        window.fragmentShaderSession = new EditSession( document.getElementById("fragmentShader").value );
        window.fragmentShaderSession.setMode(new GLSL_ES_Mode());
        return editor;
    };
    window.aceeditor = initEditor('glslEditor');

    tabview.on("selectionChange", function(e){
        switch (e.newVal.get('index')){
            case 0:
                document.getElementById('glslEditorPanel').style.display = "block";
                window.aceeditor.setSession(window.vertexShaderSession);
                    // clear undo manager
                var UndoManager = require("ace/undomanager").UndoManager;
                window.aceeditor.getSession().setUndoManager(new UndoManager());
            break;
            case 1:
                document.getElementById('glslEditorPanel').style.display = "block";
                window.aceeditor.setSession(window.fragmentShaderSession);
                    // clear undo manager
                var UndoManager = require("ace/undomanager").UndoManager;
                window.aceeditor.getSession().setUndoManager(new UndoManager());
            break;
            case 2:
                document.getElementById('glslEditorPanel').style.display = "none";
            break;
        }
    });

    (function setupSettings(){
        var meshsetting = document.getElementById('meshsetting'),
            rotatemesh = document.getElementById('rotatemesh'),
            resetShaderBut = document.getElementById('resetShader'),
            addChildListeners = function (component, listener, listenerNames,tag){
                var i;
                for (i=0;i<component.children.length;i++){
                    if (Array.isArray(listenerNames)){
                        for (j=0;j<listenerNames.length;j++){
                            component.children[i].addEventListener(listenerNames[j],listener,false);
                        }
                    } else {
                        component.children[i].addEventListener(listenerNames,listener,false);
                    }
                    if (tag){
                        component.children[i][tag] = i;
                    }
                }
            };
        function changeMeshfunction(e){
            var meshFactoryFunc;
            var size = 0.5;
            switch(this.meshid){
                case 0:
                    meshFactoryFunc = KICK.scene.MeshFactory.createCube;
                break;
                case 1:
                    meshFactoryFunc = KICK.scene.MeshFactory.createIcosphere;
                    size = 2; // subdivisions
                break;
                default:
                    meshFactoryFunc = KICK.scene.MeshFactory.createPlane;
                break;
            }
            setMesh(meshFactoryFunc,size);
        }
        addChildListeners(meshsetting,changeMeshfunction,'click',"meshid");

        function onRotateMesh(e){
            isRotating = this.isOn;
        }
        addChildListeners(rotatemesh,onRotateMesh,'click',"isOn");
        resetShaderBut.addEventListener('click',resetShader,false);

        (function addLightListeners(){
            var lightpos = document.getElementById('lightpos'),
                lightrot = document.getElementById('lightrot'),
                lightcolor = document.getElementById('lightcolor'),
                lightintensity = document.getElementById('lightintensity');
            function updateLightPosition(e){
                var position = lightTransform.position;
                position[this.position] = this.value;
                lightTransform.position = position;
            }
            addChildListeners(lightpos,updateLightPosition,['click','change'],"position");

            function updateLightRotation(e){
                var x = document.getElementById('light_rot_x').value;
                var y = document.getElementById('light_rot_y').value;
                var z = document.getElementById('light_rot_z').value;
                lightTransform.rotationEuler = [x,y,z];
            }
            addChildListeners(lightrot,updateLightRotation,['click','change'],"position");

            function updateLightColor(e){
                var lightColor = light.color;
                lightColor[this.position] = this.value;
                light.color= lightColor;
            }
            addChildListeners(lightcolor,updateLightColor,['click','change'],"position");

            function updateColorIntensity(e){
                light.intensity = this.value;
            }

            lightintensity.addEventListener('change',updateColorIntensity,false);
            lightintensity.addEventListener('click',updateColorIntensity,false);
        })();


        (function addAmbientListener(){
            var am = document.getElementById('ambientLight');
            function updateAmbient(e){
                var color = ambientLight.color;
                color[this.position] = this.value;
                ambientLight.color = color;
            }

            addChildListeners(am,updateAmbient,['click','change'],"position");
        })();


        addGLConstantToSelect('textureFormat',[c.GL_ALPHA,c.GL_RGB,c.GL_RGBA,c.GL_LUMINANCE,c.GL_LUMINANCE_ALPHA]);
        addGLConstantToSelect('textureMode',[c.GL_REPEAT,c.GL_CLAMP_TO_EDGE]);
        addGLConstantToSelect('minFilter',[c.GL_NEAREST,c.GL_LINEAR,c.GL_NEAREST_MIPMAP_NEAREST,c.GL_LINEAR_MIPMAP_NEAREST,c.GL_NEAREST_MIPMAP_LINEAR,c.GL_LINEAR_MIPMAP_LINEAR]);
        addGLConstantToSelect('magFilter',[c.GL_NEAREST,c.GL_LINEAR]);

        document.getElementById('savebutton').addEventListener('click', trySave,false);

        document.getElementById('addTextureButton').addEventListener('click', addTexture, false);
        document.getElementById('removeTextureButton').addEventListener('click', removeTexture, false);
        document.getElementById('currentTextures').addEventListener('click', textureSelected, false);
        document.getElementById('updateTexture').addEventListener('click', textureUpdate, false);

        tryLoadConfigFromLocalStorage();
    })();
});