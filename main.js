var settings = { api_key : false, region: 'us'};
var userData = {};
var settingsWindow;
 
function closeSettings(){

	settingsWindow.fadeOut(200);
}

function getFullPath(path)
{
    if (settings.region === 'eu') {
        return 'https://authenticate.eu.teamwork.com/' + path;
    }

    return 'https://authenticate.teamwork.com/' + path;
}

function openSettings(){

	closeSettings();

    if( ! settings.api_key)
    {
        var alt_id = 'alt-' + Math.floor(Math.random() * 100000);


        $('body').prepend('<div class="alert alert-danger '+alt_id+'">Please enter your API key</div>');

        setTimeout(function(){
            $('.'+alt_id).fadeOut(200, function(){
               $(this).remove();
            });
        }, 2000)
    }

	$('#form_api_key').val(settings.api_key);
    $('#form_region').val(settings.region);
	
	settingsWindow.fadeIn(200);
 
}
 
function apiRequest(url, callback, type){

    if(typeof callback == 'undefined')
        callback = function(){};

    if(typeof type == 'undefined')
        type = 'GET';

	$.ajax({
            url: url,
            type: type,
			beforeSend: function(xhr) {
			  xhr.setRequestHeader("Authorization", "Basic " + btoa(settings.api_key + ":x"));
			},
			processData: false,
            cache :  false,
            dataType: type == 'PUT' || type == 'DELETE' ? null : 'json',
            success: function(response){
                if(response.STATUS == 'OK')
				{
					callback(response);
				}				
            },
            error: function(error) {

                setTimeout(function () {

                    var alt_id = 'alt-' + Math.floor(Math.random() * 100000);
                    $('.alert').remove();
                    $('body').prepend('<div class="alert alert-danger '+alt_id+'">Server Error, please check your API key</div>');
                    openSettings();

                    setTimeout(function(){
                        $('.'+alt_id).fadeOut(200, function(){
                            $(this).remove();
                        });
                    }, 2000)

                }, 1000);
            }

        });
}

function saveSettings(){
        settings['api_key'] = $('#form_api_key').val();
        settings['region'] = $('#form_region').val();

		chrome.storage.sync.set(settings, function() {

        var alt_id = 'alt-' + Math.floor(Math.random() * 100000);
        $('body').prepend('<div class="alert alert-success '+alt_id+'">Settings Saved</div>');

        setTimeout(function(){
            $('.'+alt_id).fadeOut(200, function(){
                $(this).remove();
            });
        }, 2000);

          getTasks();
		  closeSettings();
        }); 
}
 
function getSettings(callback){

		chrome.storage.sync.get(null, function(res){
			settings = res;
            callback();

		});
	
}

function getTasks(){
	 
	if(typeof userData.userId == 'undefined')
	{

        try{
            apiRequest(getFullPath('authenticate.json'), function(response){

                userData.userId = response.account.userId;
                userData.URL = response.account.URL;

                $('#company .title').html(response.account.companyname);
                $('#company .user').html(response.account.firstname);
                $('#company .image').attr('src', response.account['avatar-url']);

                if (! response.account['avatar-url']) {
                    $('#company .image').remove();
                }
                

                loadTasks();
            });
        }catch (e){

            console.log(e);
            alert('!');
            var alt_id = 'alt-' + Math.floor(Math.random() * 100000);
            $('body').prepend('<div class="alert alert-danger '+alt_id+'">Server Error, please check your API key!!</div>');
            openSettings();

            setTimeout(function(){
                $('.'+alt_id).fadeOut(200, function(){
                    $(this).remove();
                });
            }, 2000)
        }
	}
	else
	{
		loadTasks();
	}
}

function initTaskList(){

    if($('#tasks .task').length)
        $('#tasks').fadeIn(200);

    if($('#tasks-anyone .task').length)
        $('#tasks-anyone').fadeIn(200);

    if( ! $('.task').length)
        $('#no-tasks').fadeIn(200);
    else
        $('#no-tasks').fadeOut(200);

    $('.task').click(function () {

        if($(this).hasClass('open'))
        {
            $('.task.open').removeClass('open');
        }
        else {
            $('.task.open').removeClass('open');
            $(this).addClass('open');
        }
    });

    $('.task .check').click(function(e){
        e.stopPropagation();

        var ptask = $(this).parent('.task');

        var task_id = ptask.attr('data-id');
        var checked = ptask.hasClass('checked');

        if(checked)
            apiRequest(userData.URL + 'tasks/'+task_id+'/uncomplete.json', function(){}, 'PUT');
        else
            apiRequest(userData.URL + 'tasks/'+task_id+'/complete.json', function(){}, 'PUT');

        ptask.toggleClass('checked');
    });
}

function loadTasks(id){

	apiRequest(userData.URL + 'tasks.json?responsible-party-id=0,'+userData.userId, function(response){

        $('.task').remove();
        $('#loading').fadeOut(200);
        $('header').fadeIn(200);

        $.each(response['todo-items'], function(key, item){
		
			var ex_class = '';
			
			if(item.completed)
				ex_class = ' completed';

            var task_url = userData.URL + 'tasks/' + item.id;
            var due_date = item['due-date'].length ? 'Due '+moment(item['due-date'], "YYYYMMDD").format("MMM Do") : '';
            var time_info = due_date ? due_date : 'Created ' + moment(item['created-on']).fromNow();
            var comment_count = item['comments-count'];

            comment_count = parseInt(comment_count) ? '<i class="ion-ios-chatbubble"></i> '+comment_count : '';

            var description = item.description.replace(/\n/g, "<br />");
            var has_more = description != '' ? ' <i class="ion-more"></i>' : '';

			var html = '<div class="task'+ex_class+'" data-id="'+item.id+'"><div class="check"></div><div class="content">'+item.content+' '+has_more+'<div class="description">'+description+'</div></div><div class="info"><a class="sm-info" href="'+task_url+'" target="_blank">View on Teamwork</a><div class="sm-info">'+time_info+'</div><div ' +
                'class="sm-info">'+comment_count+'</div><div class="sm-info project">'+item['project-name']+'</div><div class="clearfix"></div></div></div>';

            if(typeof item['responsible-party-id'] != 'undefined')
			    $('#tasks').append(html);
            else
                $('#tasks-anyone').append(html);
		});

        initTaskList();
	});
}

function initLoadingScreen(){
    var icons = ['beer', 'coffee', 'pizza', 'happy-outline', 'ios-body', 'ios-game-controller-b-outline', 'ios-lightbulb-outline', 'android-time', 'ios-nutrition', 'beer'];
    $('#loading').hide().html('<i class="ion-'+icons[Math.floor(Math.random() * 9)]+'">').fadeIn(100);
}

$(function(){

    settingsWindow = $('#settings');

    initLoadingScreen();
	getSettings(function () {

        if( ! settings.api_key)
        {
            console.log('no settings');
            openSettings();
        }
        else
        {
            getTasks();

            /*
            setInterval(function(){
                getTasks();
            }, 30000);
            */
        }

    });

    $('#open_settings').click(function(){
        openSettings();
    });

	$('#save_settings').click(function(){
		saveSettings();
	});
	
});