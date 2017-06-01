/* add-on script */
// MyAddon functionality
$(function () {
    var spinning = false, isUpdatingViews;
    function initPage(request, Prism) {
        var $projectDropdown = $("#projectOption");

        var $boardsElem, sprintsByBoardID = {};
        var $element = this;
        loadBoardDropdownOptions('/rest/agile/1.0/board', function ($boards) {
            $boardsElem = $boards;
            $(".popupBoards").append($boards);

            function updateBoardSelectedState(element) {
                var boardID = $(element).closest('tr').attr('boardID');
                var boardInfo = sprintsByBoardID[boardID];

                if (!boardID || !boardInfo)
                    return;

                // Handling board checkbox based on their corresponding sprints checkbox selection using tri-state.
                var sprintsChecked = $("input[boardID=" + boardID + "]:checked", boardInfo.sprints);

                if ((sprintsChecked.length > 0) && ($(boardInfo.sprints).length > sprintsChecked.length)) {
                    $("[value=" + boardID + "]").find("input").prop({ "indeterminate": true, "checked": false });
                } else if ((sprintsChecked.length) == 0) {
                    $("[value=" + boardID + "]").find("input").prop({ "indeterminate": false, "checked": false });
                } else {
                    $("[value=" + boardID + "]").find("input").prop({ "indeterminate": false, "checked": true })
                }
            }
            // Appending sprints based on the selected board.
            function updateSprints(element, isExpanded, isChecked) {
                var boardID = $(element).closest('tr').attr("value");
                var $selectedBoard = $(element).closest('tr');

                if (!sprintsByBoardID[boardID]) {
                    sprintsByBoardID[boardID] = {};
                    loadSprintDropdownOptions(boardID, function ($sprints) {
                        var boardInfo = { isExpanded: isExpanded, sprints: $sprints, isAddedToDOM: false };
                        sprintsByBoardID[boardID] = boardInfo;

                        // Check whether board isExpanded and append sprints as child.
                        if (isExpanded) {
                            $sprints.insertAfter($selectedBoard);
                            boardInfo.isAddedToDOM = true;
                        }

                        // Check sprints on board selection, append sprints as child to board when collapsed state is true.
                        if (isChecked) {
                            $sprints.find("input").attr('checked', true);
                            if (boardInfo.isAddedToDOM == false && isExpanded == false) {
                                $sprints.hide();
                                $sprints.insertAfter($selectedBoard);
                                boardInfo.isAddedToDOM = true;
                            }
                        }

                        // Check board based on tri-state using the checked sprints values.
                        $(".sprintCheckbox", $sprints).change(function () {
                            $projectDropdown.val("");
                            updateBoardSelectedState(this);
                        });

                        $(".sprintLabel", $sprints).click(function () {
                            var sprintLabelelement = $(this).closest('tr').find('input:checkbox');
                            if (sprintLabelelement.prop('checked'))
                                sprintLabelelement.attr('checked', false);
                            else
                                sprintLabelelement.attr('checked', true);

                            updateBoardSelectedState(this);
                        });
                    });
                }
                else {
                    var boardInfo = sprintsByBoardID[boardID];

                    if (boardInfo == {})
                        return;
                    if (!boardInfo.isAddedToDOM)
                        $(boardInfo.sprints).insertAfter($selectedBoard);

                    if (boardInfo.isExpanded == true) {
                        boardInfo.isExpanded = false;
                        $(boardInfo.sprints).hide();
                    }
                    else {
                        boardInfo.isExpanded = true;
                        $(boardInfo.sprints).show();
                    }
                }
            }

            // Toggling expand and collapse icon based on click.
            $(".boardExpanderCue", $boards).click(function () {
                $(this).toggleClass('aui-icon aui-icon-small aui-iconfont-expanded aui-icon aui-icon-small aui-iconfont-collapsed');
                updateSprints(this, true, false);
            });

            // Check and Uncheck sprints based on board selection.
            $(".boardCheckbox", $boards).change(function () {
                $projectDropdown.val("");
                var boardID = $(this).closest('tr').attr("value");

                if (sprintsByBoardID[boardID] == undefined) {
                    updateSprints(this, false, true);
                }
                else {
                    var boardInfo = sprintsByBoardID[boardID];
                    if (this.checked == true)
                        $(boardInfo.sprints).find("input").attr('checked', true);
                    else
                        $(boardInfo.sprints).find("input").attr('checked', false);
                }
            });

            // Get results based opn selected boards ans sprints.
            $(".ok-button").click(function () {
                $(".buttonSwitch").prop('disabled', false);
                if (isUpdatingViews == true) {
                    var interval = setInterval(function () {
                        if (isUpdatingViews == false) {
                            clearInterval(interval);
                            displayDescOnButtonClick();
                        }
                    }, 1000);
                }
                else {
                    displayDescOnButtonClick();
                }
            });

            function displayDescOnButtonClick() {
                var elements = $('input.sprintCheckbox:checked');
                var sprints = "", queryStrings = [], boardids = [];

                for (var i = 0; i < elements.length; i++) {
                    var sprint = elements[i].getAttribute("sprintValue");
                    var boardid = $(elements[i]).parents('tr').attr('boardID');
                    if (boardids.indexOf(boardid) == -1) {
                        boardids.push(boardid);
                        if (sprints != "")
                            queryStrings.push(sprints);
                        // String to process single sprint.
                        sprints = 'sprint="' + sprint + '"';
                    }
                    else
                        // String to process multiple sprints.
                        sprints += ' OR sprint="' + sprint + '"';
                }
                if (sprints != "")
                    queryStrings.push(sprints);

                function getDescForBoardsRecursively(index, issues) {
                    if (boardids.length <= index && queryStrings.length <= index) {
                        // Call your helper function to build the
                        // table, now that you have the data
                        Prism.ShowDocDescription(issues, ".projects");
                        $(".descriptionArea").show();
                        $(".borderTop").css({"border-top": "0","border-bottom":"0"});
                        $(".popupDialogBox").hide();
                        return;
                    }

                    var boardID = boardids[index];
                    var sprints = queryStrings[index];
                    var jql = '/rest/agile/1.0/board/' + boardID + '/issue?jql=' + sprints + '&field=description&expand=renderedFields';
                    getIssueDescriptionText(jql, function (str) {
                        // Convert the string response to JSON
                        var response = JSON.parse(str);
                        issues = [].concat.apply(issues, response.issues);
                        getDescForBoardsRecursively(index + 1, issues);
                    });
                }
                getDescForBoardsRecursively(0, []);
            }

            // Uncheck all selected boards and sprints using clear button. 
            $(".clear-button").click(function () {
                $('.sprintCheckbox').attr('checked', false);
                $('.boardCheckbox').prop({ 'checked': false, 'indeterminate': false });
            });
        });

        loadProjDropdownOptions('/rest/api/2/project');

        // To append the project option in the dropdown
        $projectDropdown.mousedown(function () {
            $(".buttonSwitch").prop('disabled', true);
        });

        // To show the div with description of selected project
        $projectDropdown.change(function () {
            $('.boardCheckbox,.sprintCheckbox').prop({ 'checked': false, 'indeterminate': false });
            $(".projects").empty();
            var projValue = $projectDropdown.val();
            var projUrl = '/rest/api/latest/search?jql=project="' + projValue + '"&field=description&expand=renderedFields';

            loadIssueDescriptionInTable(projUrl);
            $(".buttonSwitch").prop('disabled', false);
        });

        // To show the desciption of selected catogory in category dropdown
        $("#categoryDropDown").change(function () {
            var data = $(this).data("dataContext");
            var categoryValue = this.value;
            loadGroupDescription(data, categoryValue);
            $(".buttonSwitch").prop('disabled', false);
        });

        function loadGroupDescription(data, categoryValue) {
            var $descriptionElement = $(".projects").empty();
            var $displayDescription = $(".displayDescription").empty();
            // Displaying the key and result after sorting.
            for (var i = 0; i < data.length; i++) {
                if (categoryValue == "None" || (categoryValue == "*" && data[i].GroupName != "")
                    || data[i].GroupName == categoryValue) {
                    var description = data[i].DescText;
                    var key = data[i].key;
                    var url = Prism.ProjectBaseUrl + key;
                    $descriptionElement.append("<a target='_blank' href=" + url + "><div style='display:inline-block;'><h6>" + key + "<h6></div></a>");
                    var DescTextSort = data[i].DescText;
                    $descriptionElement.append("<div>" + DescTextSort + "</div>");
                    $displayDescription.append("<div>" + DescTextSort + "</div>");
                }
            }
        }

        // To export the result using button click.
        $(".exportDesc").click(function () {
            if ($(".buttonShowKeyDesc").prop('checked'))
                Prism.SaveDocDescription(".projects");
            else
                Prism.SaveDocDescription(".displayDescription");
        });

        function loadBoardDropdownOptions(boardUrl, callBack) {
            if (!spinning) {
                AJS.$('.displayDesc-spinner').spin();
                spinning = true;
            }
            isUpdatingViews = true;
            request({
                url: boardUrl,
                success: function (response) {
                    // Convert the string response to JSON
                    response = JSON.parse(response);
                    var $boards = $("<table class='boards' style='width:100%;'></table>");

                    for (var i = 0; i < response.values.length; i++) {
                        var name = response.values[i].name;
                        var id = response.values[i].id;
                        $boards.append("<tr class='boardList' bdname='" + name + "' value='" + id + "'><td style='width:100%;'><div class='boardExpanderCue aui-icon aui-icon-small aui-iconfont-collapsed' style='float: left;margin-top: 3px;'></div><div style='display: inline-block;float: left;'><input class='boardCheckbox' type='checkbox'></div><div style='display:block;word-break: break-word;'>" + name + "</div></td></tr>");
                    }

                    if (typeof callBack == "function")
                        callBack($boards);
                    isUpdatingViews = false;
                    AJS.$('.displayDesc-spinner').spinStop();
                    spinning = false;
                }
            });
        }

        function loadSprintDropdownOptions(boardID, callBack) {
            if (!spinning) {
                AJS.$('.displayDesc-spinner').spin();
                spinning = true;
            }
            isUpdatingViews = true;
            request({
                url: '/rest/agile/1.0/board/' + boardID + '/sprint',
                success: function (response) {
                    // Convert the string response to JSON
                    response = JSON.parse(response);
                    var sprintsStr = "";

                    for (var i = 0; i < response.values.length; i++) {
                        var sprintList = response.values[i].name;
                        sprintsStr += "<tr class='sprintList' boardID='" + boardID + "' style='display:inline-table;padding-left: 30px;'><td class='spDropOption' style='display:none;' value='" + sprintList + "'></td><td style='width:20px;'><input boardID='" + boardID + "' class='sprintCheckbox' type='checkbox' sprintValue='" + sprintList + "'></td><td style='width: 100%;'><label class='sprintLabel'>" + sprintList + "</label></td><td></td></tr>";
                    }
                    if (typeof callBack == "function")
                        callBack($(sprintsStr));
                    isUpdatingViews = false;
                    AJS.$('.displayDesc-spinner').spinStop();
                    spinning = false;
                }
            });
        }

        function loadProjDropdownOptions(jql) {
            if (!spinning) {
                AJS.$('.displayDesc-spinner').spin();
                spinning = true;
            }
            request({
                url: jql,
                success: function (response) {
                    // Convert the string response to JSON
                    response = JSON.parse(response);

                    var $projDropdown = $("#projectOption");
                    for (var i = 0; i < response.length; i++) {
                        var projList = response[i].name;
                        $("datalist", $projDropdown).append("<aui-option class='projDropOption' value='" + projList + "'>" + projList + "</aui-option>");
                    }
                    AJS.$('.displayDesc-spinner').spinStop();
                    spinning = false;
                }
            });
        }

        function loadIssueDescriptionInTable(projUrl) {
            if (!spinning) {
                AJS.$('.displayDesc-spinner').spin();
                spinning = true;
            }
            request({
                url: projUrl,
                success: function (response) {
                    // Convert the string response to JSON
                    response = JSON.parse(response);

                    // Call your helper function to build the
                    // table, now that you have the data
                    Prism.ShowDocDescription(response.issues, ".projects");
                    $(".descriptionArea").show();
                    $(".borderTop").css({"border-top": "0","border-bottom":"0"});
                    $(".popupDialogBox").hide();
                    AJS.$('.displayDesc-spinner').spinStop();
                    spinning = false;
                },
                error: function (response) {
                    console.log("Error loading API (" + projUrl + ")");
                    console.log(arguments);
                },
                contentType: "application/json"
            });
        }

        function getIssueDescriptionText(restAPIUrl, callBack) {
            if (!spinning) {
                AJS.$('.displayDesc-spinner').spin();
                spinning = true;
            }
            request({
                url: restAPIUrl,
                success: function (response) {
                    if (typeof callBack == "function")
                        callBack(response);
                    AJS.$('.displayDesc-spinner').spinStop();
                    spinning = false;
                },
                error: function (response) {
                    console.log("Error loading API (" + projUrl + ")");
                    console.log(arguments);
                },
                contentType: "application/json"
            });
        }
    }
    AP.require(['request', 'Prism'], initPage);
});