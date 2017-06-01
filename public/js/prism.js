// Canned functionality for Prism
$(function () {
    "use strict";

    // Get parameters from query string
    // and stick them in an object
    function getQueryParams(qs) {
        qs = qs.split("+").join(" ");

        var params = {}, tokens,
            re = /[?&]?([^=]+)=([^&]*)/g;

        while (tokens = re.exec(qs)) {
            params[decodeURIComponent(tokens[1])] =
                decodeURIComponent(tokens[2]);
        }

        return params;
    }

    var params = getQueryParams(document.location.search);
    var projectBaseUrl = params.xdm_e + params.cp + "/browse/";

    AP.define('Prism', {
        ProjectBaseUrl: projectBaseUrl,

        ShowDocDescription: function (issues, selector) {
            function buildDivAndReturnResult(hostElement) {
                var projDiv = hostElement.append("div")
					.classed({ 'projects': true, 'aui': true });

                return projDiv;
            }

            var rootElement = d3.select(selector);
            rootElement.html("");
            var projBody = buildDivAndReturnResult(rootElement);

            var groupName = "";

            // Process the issue description and get the text given in the range(B/W tag #start and #end).
            var sortArr = [], spinning = false,
                sortArrWithoutGrp = [], resultsArray = [],
				categories = [];
            for (var i = 0; i < issues.length; i++) {
                var issueDesc = issues[i].renderedFields.description;
                var results = getDescriptionTextAndSortId(issueDesc);

                if (results != null) {
                    if (results.GroupsInfo != null) {
                        var groupsInfo = results.GroupsInfo;
                        // For Sorting in Groups
                        for (var j = 0; j < groupsInfo.GroupNames.length; j++) {
                            if (groupName != "" && groupName != groupsInfo.GroupNames[j])
                                continue;

                            if (categories.indexOf(groupsInfo.GroupNames[j]) == -1)
                                categories.push(groupsInfo.GroupNames[j]);

                            var descWithGroup = groupsInfo.DescsByGrpNameDict[groupsInfo.GroupNames[j]];
                            groupsInfo.key = issues[i].key;

                            for (var k = 0; k < descWithGroup.length; k++) {
                                descWithGroup[k].key = issues[i].key;
                                sortArr.push(descWithGroup[k]);
                            }
                        }
                    }

                    // For Sorting without groups
                    var descWithoutGroup = results.DescsWithoutGroup;
                    for (var k = 0; k < descWithoutGroup.length; k++) {
                        descWithoutGroup[k].key = issues[i].key;
                        sortArrWithoutGrp.push(descWithoutGroup[k]);
                    }
                }
            }

            sortBySortID(sortArr);
            if (groupName == "") {
                sortBySortID(sortArrWithoutGrp);
                sortArr = sortArr.concat(sortArrWithoutGrp);
            }

            // For each data item in projects
            var $descriptionElement = $(projBody[0]);
            $(".displayDescription").empty();
            // Displaying the key and result after sorting.
            for (var i = 0; i < sortArr.length; i++) {
                var key = sortArr[i].key;
                var url = projectBaseUrl + key;
                $descriptionElement.append("<a target='_blank' href=" + url + "><div style='display:inline-block;'><h6>" + key + "<h6></div></a>");
                var DescTextSort = sortArr[i].DescText;
                $descriptionElement.append("<div>" + DescTextSort + "</div>");
                $(".displayDescription").append("<div>" + DescTextSort + "</div>");
            }

            // Sorting based on SortID.
            function sortBySortID(array) {
                array.sort(function (a, b) {
                    return a.SortID - b.SortID;
                });
            }

            var $categoryDropDown = $("#categoryDropDown");
            $("datalist", $categoryDropDown).empty();
            $categoryDropDown.val("");

            $("datalist", $categoryDropDown).append("<aui-option value=''>None</aui-option>"
											).append("<aui-option value='*'>All</aui-option>");

            for (var i = 0; i < categories.length; i++) {
                $("datalist", $categoryDropDown).append("<aui-option value='" + categories[i] + "'>" + categories[i] + "</aui-option>");
            }

            $categoryDropDown.data("dataContext", sortArr);

            function getDescriptionTextAndSortId(value) {
                var regExp = /(#start (<p>|<\/p>|\n|)+([\s\S]*?) #end)+/gm;

                var regExpArr, regExEval, regExpSortArr = [], projectData = [], messageInDesc = "", emptyNum = Math.min(),
                    groupData = [], grpTxtDict = {};

                // Regex evaluation for the given string.
                do {
                    regExpArr = regExp.exec(value);

                    // Regular Expression for getting the group string (from {# to } )
                    var regExpForGroup = /(^{#([\s\S]*?)})+/gm;

                    //Regexfor desc without paragraph tags
                    var regExForDesc = /(<p>|<\/p>|\n|)+(([\s\S]*)+)/gm;

                    if (regExpArr == null)
                        break;

                    if (regExpArr)
                        regExpSortArr.push(regExpArr);

                    var groupName = "", regExEval = "";
                    if (regExpArr[3].substring(0, 2) == "{#") {
                        regExEval = regExpForGroup.exec(regExpArr[3]);
                        // Getting group name if any.
                        if (regExEval != null)
                            groupName = regExEval[2];
                    }

                    var desc, messageInDesc, messageToFindNum, numInDesc;
                    if (groupName != "") {
                        var condForGroup = regExpArr[3].split("{#" + groupName + "}")[1];
                        desc = regExForDesc.exec(condForGroup);
                    }

                    else {
                        messageInDesc = regExpArr[3];
                        messageToFindNum = regExpArr[3].trim("<p>").trim("</p>");
                    }

                    if (regExEval != "") {
                        // Getting the result string from array.
                        messageInDesc = desc[3].trim();
                        numInDesc = isNaN(desc[3].trim().split(" ")[0]) ? emptyNum : desc[3].trim().split(" ")[0];
                    }
                    else {
                        numInDesc = messageToFindNum.split(" ")[0];
                    }

                    var res = { SortID: numInDesc, DescText: "", GroupName: "" };
                    if (regExEval != null)
                        res.GroupName = groupName;

                    if (numInDesc != emptyNum && numInDesc != ("\n"))
                        res.DescText = messageInDesc.split(numInDesc)[1].trim();
                    else
                        res.DescText = messageInDesc.trim();

                    if (groupName != "") {
                        if (grpTxtDict[groupName]) {
                            grpTxtDict[groupName].push(res);
                        }
                        else {
                            grpTxtDict[groupName] = [res];
                            groupData.push(groupName);
                        }
                    }
                    else {
                        projectData.push(res);
                    }

                } while (regExpArr);

                return { GroupsInfo: { GroupNames: groupData, DescsByGrpNameDict: grpTxtDict }, DescsWithoutGroup: projectData };
            }
        },

        SaveDocDescription: function (selector) {
            // Contain div elements within table.
            var str = "<table><tr><td> " + $(selector).html() + " </tr></td></table>";
            var blob = new Blob([str], { type: "image/png;text/css;charset=utf-8" });
            saveAs(blob, "TextFile.html");
        }
    });

    $(document).ready(function () {
        var spinning = false;
        $(".displayKeyandDesc").click(function () {
            if (!spinning) {
                AJS.$('.displayDesc-spinner').spin();
                spinning = true;
                $(".buttonShowKeyDesc").prop('checked', true);
                $(".displayKeyandDesc").attr('aria-pressed', 'true');
                $(".displayDesc").attr('aria-pressed', 'false');
                $(".projects").show();
                $(".displayDescription").hide();
                AJS.$('.displayDesc-spinner').spinStop();
                spinning = false;
            }
        });

        $(".displayDesc").click(function () {
            if (!spinning) {
                AJS.$('.displayDesc-spinner').spin();
                spinning = true;
                $(".buttonShowKeyDesc").prop('checked', false);
                $(".displayDesc").attr('aria-pressed', 'true');
                $(".displayKeyandDesc").attr('aria-pressed', 'false');
                $(".projects").hide();
                $(".displayDescription").show();
                AJS.$('.displayDesc-spinner').spinStop();
                spinning = false;
            }
        });
    });
});