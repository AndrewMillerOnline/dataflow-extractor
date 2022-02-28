{
    var flow;
    var registerNodes;
    var extractedBranch = new Map();

    /**
     * Called on load, creates an event listener on the file input element to process the uploaded file
     */
    function init() {
        document.getElementById('fileInput').addEventListener('change', handleFileSelect, false);
    }

    /**
     * Read the uploaded file as text
     * @param {*} event 
     */
    function handleFileSelect(event) {
        const reader = new FileReader()
        reader.onload = handleFileLoad;
        reader.readAsText(event.target.files[0])
    }

    /**
     * Called after uploading and reading the file.  Update the UI to show uploaded file information and processing options
     * @param {*} event 
     */
    function handleFileLoad(event) {
        console.log(event);
        document.getElementById('fileContent').textContent = event.target.result;

        //parse the json text into an object
        flow = JSON.parse(event.target.result);

        document.getElementById('btnOriginal').innerHTML = "Original JSON Input: " + Object.keys(flow).length + " nodes";

        //loop through to find all register nodes
        registerNodes = new Map();
        for (var key of Object.keys(flow)) {
            if (flow[key].action == "sfdcRegister") {
                registerNodes.set(key, flow[key]);
            }
        }

        //display the results
        document.getElementById('results').textContent = "Found " + registerNodes.size + " register nodes.  Click the nodes to extract.";
        let nodePicker = document.getElementById('nodePicker');

        //add buttons for each register node, so the user can select which to extract
        registerNodes.forEach((node, name) => {
            let button = document.createElement("input");
            button.setAttribute("value", name);
            button.setAttribute("class", "btn btn-outline-primary m-1");
            button.setAttribute("type", "button");
            button.setAttribute("id", name);
            button.setAttribute("onclick", "extractBranch('" + name + "')");

            nodePicker.appendChild(button);
        })
    }

    /**
     * Extract the desired branch, based on the button clicked
     * @param {String} registerNodeName Name of the dataset the user selected
     */
    function extractBranch(registerNodeName) {

        //set button style so user knows it was clicked
        document.getElementById(registerNodeName).setAttribute("class", "btn btn-primary m-1");

        let registerNode = extractAndAdd(registerNodeName);

        //Recursively build the branch
        extractBranchRecursive(registerNode.parameters.source);

        //enable the download button and show json preview
        document.getElementById('downloadButton').setAttribute("class", "btn btn-success visible");
        document.getElementById('resultJSON').textContent = JSON.stringify(Object.fromEntries(extractedBranch), null, 2);

        document.getElementById('resultsButton').innerHTML = "Results: " + extractedBranch.size + " nodes";
    }

    /**
     * Recursively travels down a branch, adding dependent nodes to extractedBranch
     * @param {String} nodeName The starting node
     */
    function extractBranchRecursive(nodeName) {
        let working = true;

        let node = extractAndAdd(nodeName);

        while (working) {
            if (node.action == "sfdcDigest" || node.action == "edgemart" ||
                node.action == "digest") {
                working = false;
            } else {
                if (node.parameters.source != null) {
                    node = extractAndAdd(node.parameters.source);
                } else if (node.parameters.left != null) {
                    //call the recursive function for the right side of the augment as well
                    extractBranchRecursive(node.parameters.right);

                    //keep going down the left side of the branch
                    node = extractAndAdd(node.parameters.left);
                } else if(node.parameters.sources != null && node.parameters.sources.length > 0) {
                    //Append nodes has an array of sources
                    //stop this loop and start a new loop for each source
                    working = false;
                    node.parameters.sources.forEach((source) => {
                        extractBranchRecursive(source);
                    })
                }
            }
        }
    }

    /**
     * Add the specified node to extractedBranch, and return its object representation
     * @param {String} nodeName Name of the node to extract
     * @returns 
     */
    function extractAndAdd(nodeName) {
        let nextNode = getNode(nodeName);
        extractedBranch.set(nodeName, nextNode);
        return nextNode;
    }

    /**
     * Get the node with the specified name
     * @param {String} name 
     * @returns 
     */
    function getNode(name) {
        return flow[name];
    }

    /**
     * Down the results in a JSON file
     */
    function download() {
        let resultsString = JSON.stringify(Object.fromEntries(extractedBranch));

        var element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(resultsString));
        element.setAttribute('download', 'extracted-results.json');

        element.style.display = 'none';
        document.body.appendChild(element);

        element.click();

        document.body.removeChild(element);
    }
}