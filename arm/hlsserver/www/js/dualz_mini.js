/* Generic functions for MINI box */


const BIT_IPANALYZER = 0x01;
const BIT_IPRECORDER = 0x02;
const BIT_IPGATEWAY = 0x04;
const BIT_HLSANALYZER = 0x08;
const BIT_HLSRECORDER = 0x10;
const BIT_IPVIDEORENDERER = 0x20;
const BIT_FILE2IP = 0x40;
const BIT_DEMUXER = 0x80;

/* app state flags. If 0, all is collected:
bit pos: value
0: networks retrieved
1: usb sticks retrieved
2: app status
3: DHCP state
4: AP state
5: SSIDs
6: License
7: hostname
8: version
9: free
*/
const monitorsRetrieved = 0b10000000000;
const networksRetrieved = 0b01000000000;
const usbMountsRetreived = 0b00100000000;
const appStatusRetrieved = 0b00010000000;
const DHCPRetrieved = 0b00001000000;
const APRetrieved = 0b00000100000;
const SSIDsRetrieved = 0b00000010000;
const licenseRetrieved = 0b00000001000;
const hostnameRetrieved = 0b00000000100;
const versionRetrieved = 0b00000000010;

function onlyWhiteSpace(exp) {
    return /^\s*$/.test(exp);
}

function showSnackbar(status) {
    // Get the snackbar DIV
    var x = document.getElementById("snackbar");
    $('#snackbar').html(status);
    // Add the "show" class to DIV
    x.className = "show";

    // After 3 seconds, remove the show class from DIV
    setTimeout(function () {
        x.className = x.className.replace("show", "")
    }, 3000);
}
function showMessage(data, status) {
    //$('#message').html("Data: " + JSON.stringify(data) + "\nStatus: " + status);
    //$('.alert').show();
    if (data["status"] === "error") {
        showSnackbar(data["status"] + ", " + data["message"])
    }
    else {
        showSnackbar(data["status"]);
    }
}

function hideNetConfigs() {
    $("#wiredConfig").addClass("d-none");
    $("#wiredConfig").removeClass("d-block");
    $("#wirelessConfig").addClass("d-none");
    $("#wirelessConfig").removeClass("d-block");
}
function showNetConfigs() {
    $("#wiredConfig").addClass("d-block");
    $("#wiredConfig").removeClass("d-none");
    $("#wirelessConfig").addClass("d-block");
    $("#wirelessConfig").removeClass("d-none");
}
function getTemperature() {
    $.post("/",
        '{ "command" : "getCurTemperature"}',
        function (data, status) {
            var json = JSON.parse(decodeURIComponent(data));
            $("#temperature").removeClass("text-warning text-danger");
            var temp = parseFloat(json.data.curTemperature);
            if (temp >= 60 && temp <= 79) {
                $("#temperature").addClass("text-warning");
            }
            else if (temp > 79) {
                $("#temperature").addClass("text-danger");
            }
            $("#temperature").text(json.data.curTemperature);
        }, "text")
}
function getTime() {
    $.post("/",
        '{ "command" : "getCurTime"}',
        function (data, status) {
            var json = JSON.parse(decodeURIComponent(data));
            $("#datetime").text(json.data.curTime);
        }, "text")
}
function fillComboInterfaces(namevaluepairs, name, defaultval) {
    var selection = $("#" + name);
    selection.empty();
    $.each(namevaluepairs, function (index, value) {
        selection.append("<option value='" + value.value + (value.value === defaultval ? "' selected" : "'") + ">" + value.name + " (" + value.value + ")" + "</option>");
    });
}
function createInterfaces(id, text, namevaluepairs, defaultval) {
    $(fillComboInterfaces(namevaluepairs, id, defaultval));
}
function createIPSettings(retrievedInterfaces, id) {
    createInterfaces(id, 'Local Interfaces ', retrievedInterfaces, "127.0.0.1");
    $.each(retrievedInterfaces, function (index, value) {
        if (value.value !== "127.0.0.1") {
            $("#MACAddress").html(value.MAC);
            return false;
        }
    });
}

function getInputInterfaces(id) {
    $.post("/",
        '{ "command" : "getInterfaces"}',
        function (data, status) {
            var json = JSON.parse(decodeURIComponent(data));
            var stringData = JSON.stringify(json);
            if (stringData.includes("succeeded")) {
                createIPSettings(json.data.interfaces, id);
            }
            showPage(networksRetrieved);
        }, "text");
};
function createSSIDList(ssids, name) {
    var selection = $("#" + name);
    selection.empty();
    $.each(ssids, function (index, value) {
        selection.append("<option value='" + value + "'>" + value + "</option>");
    });
    $("#" + name + " option:selected").prop("selected", false);
    $("#" + name + " option:first").prop("selected", "selected");
}
function getSSIDs() {
    $.post("/",
        '{ "command" : "getWifiAccessPoints"}',
        function (data, status) {
            var json = JSON.parse(decodeURIComponent(data));
            var stringData = JSON.stringify(json);
            if (stringData.includes("succeeded")) {
                createSSIDList(json.data.access_points, "ssid");
            }
            showPage(SSIDsRetrieved);
        }, "text");
};
function HideLogLevel() {
    var url = window.location.href;
    if (url.search('tech') <= 0) {
        $('#LogLevelid').hide();
    }
}
function getMountpoints(showResult) {
    $.post("/",
        '{ "command" : "getMountPoints"}',
        function (data, status) {
            var json = JSON.parse(decodeURIComponent(data));
            var stringData = JSON.stringify(data);
            if (stringData.includes("succeeded")) {
                createSSIDList(json.data.mountPoints, "usbs");
                checkUSBVersion($("#usbs").val());
            }
            if (showResult) showMessage(json, status);
            showPage(usbMountsRetreived);
        }, "text");
};
var DHCPEnabled = false;
var APEnabled = false;
var currentVersionString = "";
function setVersionString(version) {
    currentVersionString = version;
    $("#version").html("Version: " + currentVersionString);
}
function setDHCPVal(enabled) {
    DHCPEnabled = enabled;
    //$("#DHCP").prop('disabled', DHCPEnabled);
    if (DHCPEnabled) {
        $("#DHCP").attr('disabled', 'disabled');
        $("#DHCP").addClass("disabled");
        $("#DHCP").text("DHCP is enabled");
        $("#dhcpEnabled").html("(via DHCP)");
    }
    else {
        $("#DHCP").removeClass("disabled");
        $("#DHCP").removeAttr('disabled');
        $("#DHCP").text("Enable DHCP");
        $("#dhcpEnabled").html("(static IP)");
    }
}
function setAPVal(data) {
    APEnabled = data.enabled;
    $("#AP").prop('disabled', APEnabled);
    if (APEnabled) {
        $("#AP").attr('disabled', 'disabled');
        $("#AP").addClass("disabled");
        $("#AP").text("AccessPoint is enabled");
        $("#wifiConnection").html("WIFI access point <b>" + data.name + "</b> enabled");
    }
    else {
        $("#AP").removeClass("disabled");
        $("#AP").removeAttr('disabled');
        $("#AP").text("Enable AccessPoint");
        $("#wifiConnection").html("WIFI connection via <b>" + data.name + "</b>");
    }
}
function getProductName(product) {
    productName = "";
    if (product & BIT_IPANALYZER) productName += "IPAnalyser ";
    if (product & BIT_IPRECORDER) productName += "IPRecorder ";
    if (product & BIT_IPGATEWAY) productName += "IPGateway ";
    if (product & BIT_HLSANALYZER) productName += "HLSAnalyzer ";
    if (product & BIT_HLSRECORDER) productName += "HLSRecorder ";
    if (product & BIT_IPVIDEORENDERER) productName += "IPVideoRenderer ";
    if (product & BIT_FILE2IP) productName += "File2IP ";
    if (product & BIT_DEMUXER) productName += "Demuxer ";
    return productName;
}
function setLicenseInfo(license) {
    if (license.LicenseStatus === "No license") {
        $("#licenseInfo").html("<pre>LicenseStatus:\t\t" + license.LicenseStatus + "</pre>");
    }
    else {
        $("#licenseInfo").html("<pre>LicenseStatus:\t\t" + license.LicenseStatus + "\nDay:\t\t\t" + license.Day + "\nMonth:\t\t\t" + license.Month
            + "\nYear:\t\t\t" + license.Year + "\nProduct:\t\t" + getProductName(license.Product) + "\nNumber Services:\t" + license.Number
            + "\nVersion:\t\t" + license.Version + "\nTrial:\t\t" + license.Trial + "\nLicenseType:\t\t" + license.LicenseType
            + "\nLicenseID:\t\t" + license.LicenseID + "</pre>");
    }
}
function getVersion() {
    $.post("/",
        '{ "command" : "getVersion"}',
        function (data, status) {
            var json = JSON.parse(decodeURIComponent(data));
            if (JSON.stringify(json).includes("succeeded")) {
                setVersionString(json.data.version);
            }
            showPage(versionRetrieved);
        }, "text");
};
function getDHCPVal() {
    $.post("/",
        '{ "command" : "isDHCPEnabled"}',
        function (data, status) {
            var json = JSON.parse(decodeURIComponent(data));
            if (JSON.stringify(json).includes("succeeded")) {
                setDHCPVal(json.data.enabled);
            }
            showPage(DHCPRetrieved);
        }, "text");
};
function getAPVal() {
    $.post("/",
        '{ "command" : "isAPEnabled"}',
        function (data, status) {
            var json = JSON.parse(decodeURIComponent(data));
            if (JSON.stringify(json).includes("succeeded")) {
                setAPVal(json.data);
            }
            showPage(APRetrieved);
        }, "text");
};
function getLicenseInfo() {
    $.post("/",
        '{ "command" : "getLicenseInfo"}',
        function (data, status) {
            var json = JSON.parse(decodeURIComponent(data));
            if (JSON.stringify(json).includes("succeeded")) {
                setLicenseInfo(json.data);
            }
            showPage(licenseRetrieved);
        }, "text");
}
function spinning(control) {
    var curCode = control.html();
    control.html('<span class="spinner-border spinner-border-sm"></span> Setting...').addClass('disabled');
    return curCode;
};
function resetSpinning(control, code) {
    $(control).html(code).removeClass('disabled');
};

function setHostName(hostname) {
    $("#hostname").html(hostname["hostname"]);
}
function setLocalIP(localip) {
    $("#localwiredip").html(localip["local wired address"]);
}
function getHostName() {
    $.post("/",
        '{ "command" : "getHostName"}',
        function (data, status) {
            if (JSON.stringify(data).includes("succeeded")) {
                setHostName(data.data);
            }
            showPage(hostnameRetrieved);
        }, "text");
}
function getLocalIP() {
    $.post("/",
        '{ "command" : "getCurrentNetworkConfig"}',
        function (data, status) {
            var json = JSON.parse(decodeURIComponent(data));
            if (JSON.stringify(json).includes("succeeded")) {
                setLocalIP(json.data);
            }
        }, "text");
}

function showPage(state) {
    if (appState) {
        //console.log("showPage, incoming " + state + ", cur state " + appState);
        appState &= ~state;
        if (!appState)
            disableLoading();
    }
}
function enableLoading() {
    $("#loading").modal('show');
    document.getElementById("main").style.display = "none"
}
function disableLoading() {
    $("#loading").modal('hide');
    document.getElementById("main").style.display = "block"
}
function setStaticConfig(config) {
    var curCode = spinning($("#StaticConfig"));
    $.post("/",
        '{ "command" : "setStaticIP", "IPAddress":"' + $("#localIP").val().trim() + '","subNetMask":' + $("#subnetmask").val() + ',"gateway":"' + $("#gateway").val().trim() + '"}',
        function (data, status) {
            var json = JSON.parse(decodeURIComponent(data));
            getDHCPVal();
            getInputInterfaces();
            getLocalIP();
            resetSpinning($("#StaticConfig"), curCode);
            showMessage(json, status);
        }, "text");
};
function setSerialNumber(serialNumber) {
    $("#serialNumber").html(serialNumber["serialNumber"]);
}
function getSerialNumber() {
    $.post("/",
        '{ "command" : "getSerialNumber"}',
        function (data, status) {
            var json = JSON.parse(decodeURIComponent(data));
            if (JSON.stringify(json).includes("succeeded")) {
                setSerialNumber(json.data);
            }
        }, "text");
}
function createMonitorModes(modes, name) {
    var selection = $("#" + name);
    selection.empty();
    $.each(modes, function (index, value) {
        selection.append("<option value='" + value.type + ' ' + value.index + "'>" + (value.type === "CEA" ? "TV" : "Monitor") + " " + value.ratio +
            " " + value.resolution + " " + value.scan + " " + value.refresh + "</option>");
    });
    $("#" + name + " option:selected").prop("selected", false);
    $("#" + name + " option:first").prop("selected", "selected");
}
function getMonitorTypes() {
    $.post("/",
        '{ "command" : "getAllMonitorModes"}',
        function (data, status) {
            var json = JSON.parse(decodeURIComponent(data));
            var stringData = JSON.stringify(json);
            if (stringData.includes("succeeded")) {
                createMonitorModes(json.data.monitorTypes, "monitorTypes");
            }
            showPage(monitorsRetrieved);
        }, "text");
};
function getAdvancedMonitorTypes() {
    $.post("/",
        '{ "command" : "getAdvancedMonitorModes"}',
        function (data, status) {
            var json = JSON.parse(decodeURIComponent(data));
            var stringData = JSON.stringify(json);
            if (stringData.includes("succeeded")) {
                createMonitorModes(json.data.monitorTypes, "advancedMonitorTypes");
            }
            //showPage(monitorsRetrieved);
        }, "text");
};
function setCurMonitor(curType) {
    $("#curMonitor").html(curType["ratio"] + " " + curType["resolution"] + " " + curType["scan"] + " " + curType["refresh"]);
}
function getCurrentMonitor() {
    $.post("/",
        '{ "command" : "GetCurMonitorSetting"}',
        function (data, status) {
            var json = JSON.parse(decodeURIComponent(data));
            var stringData = JSON.stringify(json);
            if (stringData.includes("succeeded")) {
                setCurMonitor(json.data.currentMonitorType);
            }
        }, "text");
};

function shutdownSystem() {
    $.post("/",
        '{ "command" : "shutdownSystem"}',
        function (data, status) {
            var json = JSON.parse(decodeURIComponent(data));
            showMessage(json, status);
        }, "text");
};
function rebootSystem() {
    $.post("/",
        '{ "command" : "rebootSystem"}',
        function (data, status) {
            var json = JSON.parse(decodeURIComponent(data));
            showMessage(json, status);
        }, "text");
};
function setCurNetworkConfig(ssid) {
    $("#APName").val(ssid);
}
function getCurNetworkConfig() {
    $.post("/",
        '{ "command" : "getCurNetworkSettings"}',
        function (data, status) {
            var json = JSON.parse(decodeURIComponent(data));
            if (JSON.stringify(json).includes("succeeded")) {
                setCurNetworkConfig(json.data["ssid"]);
            }
        }, "text");
}
const colormap = new Map();
colormap.set("Error", "color:crimson");
colormap.set("Warning", "color:darkgray");
colormap.set("Alarm1", "color:red");
colormap.set("Alarm2", "color:orange");
colormap.set("Alarm3", "color:yellow");
colormap.set("CAlarm", "color:green");
colormap.set("DETAILTECH", "color:lightgray");
colormap.set("Info", "color:lightgray");
function createLine(elem) {

    let logelems = elem.split(/\s+/, 3);
    let pos = elem.indexOf("(tid:");
    let messPos = elem.indexOf(":", pos + 5);
    let message = elem.substr(messPos + 1);
    var colorStyle = "color:lightgray";
    if (colormap.has(logelems[2])) {
        colorStyle = colormap.get(logelems[2]);
    }

    var row = $('<tr class="row" style=' + colorStyle + '></tr>');
    row.append($('<td class="col-2">' + logelems[0] + '</td>'));
    row.append($('<td class="col-2">' + logelems[1] + '</td>'));
    row.append($('<td class="col-2">' + logelems[2] + '</td>'));
    row.append($('<td class="col-6">' + message + '</td>'));
    return row;
}

function showLogs(data, tableName) {
    $("#" + tableName + " tr").slice(1).remove();
    var table = $('#' + tableName).find('tbody');
    var arrayOfLines = decodeURIComponent(data).split('\n').reverse();
    $.each(arrayOfLines, function (index, element) {
        if (element && !onlyWhiteSpace(element)) {
            table.append(createLine(element));
        }
    });
};
function getLogging(table, file) {
    var command = { "command": "getLog", "nrLines": -1 };
    if (file != null) {
        command.fileName = file;
    }
    $.post("/",
        JSON.stringify(command),
        function (data, status) {
            try {
                showLogs(data, table);
            }
            catch (err) {
                console.log(err);
            }
        }, "text");
};

function startLogupdates(table, file) {
    return setInterval(getLogging, 5000, table, file);
}
function stopLogUpdates(loggerVar) {
    clearInterval(loggerVar);
}
function activateTrial() {
    $.post("/",
        '{ "command" : "activateTrial"}',
        function (data, status) {
            var json = JSON.parse(decodeURIComponent(data));
            showMessage(json, status);
        }, "text");
}