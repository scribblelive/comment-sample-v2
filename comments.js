/*

Title: ScribbleLive Comment Script
Description: This script allows users to leave comments on any page that using the scribble api. An event must be dedicated to contain user comments.

*/

var commentEngine = (function(window, $, undefined) {

    $.extend({
        ajax_progress: function( request ){
            dfd = new $.Deferred();

            request.xhr = function()
            {
                var xhr = $.ajaxSettings.xhr();
                if(xhr instanceof window.XMLHttpRequest) {
                    xhr.addEventListener('progress', this.progress, false);
                }

                if(xhr.upload) {
                    xhr.upload.addEventListener('progress', this.progress, false);
                }

                return xhr;
            }
            request.progress = function( e ) {
                if( e.loaded > 0 && e.total > 0) {
                    dfd.notify.call(request.data, {'progress': e, 'data':request.data } );
                }
            }

            $.ajax( request )
            .done( function(data, textStatus, jqXHR)
            {
                dfd.resolve( data, textStatus, jqXHR );
            })
            .fail( function(jqXHR, textStatus, errorThrown)
            {
                dfd.reject( jqXHR, textStatus, errorThrown );
            })

            return dfd.promise();
        }
    })

    function format()
    {
        var args = Array.prototype.slice.call(arguments),
            formatted = args.shift();

        for (var i = 0; i < args.length; i++) {
            var regexp = new RegExp('\\{'+i+'\\}', 'gi');
            formatted = formatted.replace(regexp, args[i]);
        }

        // remove all leftover {0} ... {n}
        formatted = formatted.replace(/\{[0-9]+\}/gi, '');
        return formatted;
    }

    function commentEngine( settings ) {
        var defaults = {
            'endpoint_v1': 'https://apiv1.scribblelive.com',
            'endpoint_v2': 'https://api.scribblelive.com/v1',
            'token': null,
            'threadId': null,
            '_v2_avatar_upload': true,
            'response': {
                USER_AUTH_OK: {
                    code: 100,
                    type: 'success',
                    message: "OK"
                },
                USER_AUTH_EXPIRED: {
                    code: 101,
                    type: 'error',
                    message: "OK"
                },
                USER_AVATAR_OK: {
                    code: 110,
                    type: 'success',
                    message: "OK"
                },
                USER_AVATAR_NOT_AN_IMAGE: {
                    code: 111,
                    type: 'error',
                    message: "Avatar is not a valid Image"
                },
                USER_AVATAR_UPLOAD_FAILED: {
                    code: 112,
                    type: 'error',
                    message: "Avatar upload failed"
                },
                USER_USERNAME_INVALID: {
                    code: 121,
                    type: 'error',
                    message: "Username '{0}' is not valid"
                },
                STREAM_OK: {
                    code: 200,
                    type: 'success',
                    message: "OK"
                },
                STREAM_UNKNOWN_STATUS: {
                    code: 201,
                    type: 'error',
                    message: "Couldn't verify status of stream"
                },
                STREAM_CLOSED: {
                    code: 202,
                    type: 'information',
                    message: "Stream is closed"
                },
                POST_OK: {
                    code: 300,
                    type: 'success',
                    message: "OK"
                },
                POST_INVALID_CONTENT: {
                    CODE: 301,
                    type: 'error',
                    message: "Invalid content type"
                },
                POST_NO_CONTENT: {
                    code: 302,
                    type: 'error',
                    message: "Contents needs to be text/html"
                },
                MEDIA_OK: {
                    code: 400,
                    type: 'success',
                    message: "OK"
                },
                MEDIA_WRONG_TYPE: {
                    code: 401,
                    type: 'error',
                    message: "Media needs to be an instance of the File object and the type must be '{0}'"
                },
                MEDIA_TOO_LARGE: {
                    code: 402,
                    type: 'error',
                    message: "Media '{0}' exceeded the allowed upload size of {1} MB"
                },
                MEDIA_NOT_SUPPORTED: {
                    code: 403,
                    type: 'error',
                    message: "Media '{0}' isn't supported"
                },
                UNKNOWN_ERROR: {
                    code: 901,
                    type: 'error',
                    message: "Unknown Error"
                }
            }
        }

        this.settings = $.extend({}, defaults, settings );
        this.limits = {
            max_file_size_image: 100,
            max_file_size_video: 250,
            max_file_size_audio: 250,
            max_file_size_unit: 1024 * 1024 // MB
        }
        this.auth = null;
    }

    commentEngine.prototype = {
        _store_avatar: function( avatar_file ) {
            var dfd = $.Deferred(),
                _self = this,
                has_avatar = typeof avatar_file != 'undefined',
                is_valid_avatar =  has_avatar && ( avatar_file instanceof File && !!avatar_file.type.match(/image/) );

            if( has_avatar && !is_valid_avatar ) {
                dfd.reject( _self.settings.response.USER_AVATAR_NOT_AN_IMAGE.code , _self.settings.response.USER_AVATAR_NOT_AN_IMAGE.type, new Error( _self.settings.response.USER_AVATAR_NOT_AN_IMAGE.message ));
            }

            if( dfd.state() === 'pending' ) {

                if( _self.settings._v2_avatar_upload === true) {
                    // ##### APIv2 avatar upload fix for SCRIB-17091 required ######
                    var _getUploadUrl = function()
                        {
                            return $.ajax({
                                url: _self.settings.endpoint_v2 + '/file-uploader/upload-url?token=' + _self.settings.token,
                                type: 'POST',
                                contentType: "application/json",    // Set contentType Header
                                data: JSON.stringify({
                                    fileName: avatar_file.name,
                                    fileType: avatar_file.type
                                })
                            })
                        },
                        _uploadImage = function( data )
                        {
                            return $.ajax_progress({
                                url: data.uploadUrl,
                                type: 'PUT',
                                data: avatar_file,
                                processData: false,
                                contentType: avatar_file.type
                            })
                            .then( function()
                            {
                                return data;
                            })
                        },
                        _getAvatarUrl = function( data )
                        {
                            return $.ajax({
                                url: _self.settings.endpoint_v2 + '/user/create/avatar?token=' + _self.settings.token,
                                type: 'POST',
                                contentType: "application/json",    // Set contentType Header
                                data: JSON.stringify({
                                    'UploadBucket': data.bucket,
                                    'UploadItem': data.key
                                })
                            })
                        };

                    _getUploadUrl()
                    .then( _uploadImage )
                    .progress( dfd.notify.bind({type:'Avatar'}) )
                    .then( _getAvatarUrl )
                    .done( function( data )
                    {
                        dfd.resolve({avatar_url: 'https://' + data.avatarUrl}, _self.settings.response.USER_AVATAR_OK.type, {   code: _self.settings.response.USER_AVATAR_OK.code,
                                                                                                                                type: _self.settings.response.USER_AVATAR_OK.type,
                                                                                                                                message: _self.settings.response.USER_AVATAR_OK.message
                                                                                                                            });
                    })
                    .fail( function()
                    {
                        dfd.reject(_self.settings.response.USER_AVATAR_UPLOAD_FAILED.code , _self.settings.response.USER_AVATAR_UPLOAD_FAILED.type, new Error( _self.settings.response.USER_AVATAR_UPLOAD_FAILED.message ) );
                    });
                }
                else {
                    // ##### APIv1 avatar upload ######
                    var _uploadAvatar = function()
                        {
                            var avatarData = new FormData();
                                avatarData.append('file', avatar_file);

                            return $.ajax_progress({
                                url: _self.settings.endpoint_v1 + "/user/avatar/upload",
                                type: 'POST',
                                data: avatarData,
                                processData: false,
                                contentType: false,
                            });
                        };

                    _uploadAvatar()
                    .progress( dfd.notify.bind({type:'Avatar'}) )
                    .done( function( data )
                    {
                        dfd.resolve({avatar_url: data}, _self.settings.response.USER_AVATAR_OK.type,    {   code: _self.settings.response.USER_AVATAR_OK.code,
                                                                                                            type: _self.settings.response.USER_AVATAR_OK.type,
                                                                                                            message: _self.settings.response.USER_AVATAR_OK.message
                                                                                                        });
                    })
                    .fail( function()
                    {
                        dfd.reject(_self.settings.response.USER_AVATAR_UPLOAD_FAILED.code , _self.settings.response.USER_AVATAR_UPLOAD_FAILED.type, new Error( _self.settings.response.USER_AVATAR_UPLOAD_FAILED.message ) );
                    });
                }
            }

            return dfd.promise();
        },
        anon_login: function(/* [force_auth, ] user_name [, user_avatar] */ )
        {
            var dfd = $.Deferred(),
                _self = this,
                args = Array.prototype.slice.call(arguments),
                force_auth = (typeof args[0] === 'boolean')? args.shift():false,
                user_name = args[0],
                has_avatar = typeof args[1] != 'undefined',
                is_valid_avatar =  has_avatar && ( args[1] instanceof File && !!args[1].type.match(/image/) )


            if( !force_auth && _self.auth_valid() ) {
                dfd.resolve( this.auth, _self.settings.response.USER_AUTH_OK.type, {    code: _self.settings.response.USER_AUTH_OK.code,
                                                                                        type: _self.settings.response.USER_AUTH_OK.type,
                                                                                        message: _self.settings.response.USER_AUTH_OK.message
                                                                                    });
            }

            if( typeof user_name !== 'string' || user_name === '' ){
                dfd.reject( _self.settings.response.USER_USERNAME_INVALID.code , _self.settings.response.USER_USERNAME_INVALID.type, new Error( format( _self.settings.response.USER_USERNAME_INVALID.message ), user_name ) );
            }

            if( dfd.state() === 'pending' ) {

                var promise_avatar_upload;

                if( has_avatar ) {
                    promise_avatar_upload = _self._store_avatar( args[1] );
                }

                // if no avatar promise is defined it will resolve to true and create the new user without avatar
                // if the avatar promise
                $.when( promise_avatar_upload ).then( function( data )
                {
                    var requestData = {
                        'Name': user_name
                    }

                    if( has_avatar ) {
                        requestData['Thumbnail'] = data.avatar_url;
                    }

                    var request = {
                        url: _self.settings.endpoint_v2 + '/user/create/anon?token=' + _self.settings.token,
                        type: 'POST',
                        dataType: 'json',
                        contentType: "application/json",    // Set contentType Header
                        data: JSON.stringify( requestData )
                    }
                    return $.ajax( request )
                })
                .progress( dfd.notify )
                .done( function( data )
                {
                    _self._set_auth('name', data.Name );
                    _self._set_auth('avatar', data.Avatar );
                    _self._set_auth('key', data.Auth );
                    _self._set_auth_update();

                    dfd.resolve( this.auth, _self.settings.response.USER_AUTH_OK.type, {    code: _self.settings.response.USER_AUTH_OK.code,
                                                                                            type: _self.settings.response.USER_AUTH_OK.type,
                                                                                            message: _self.settings.response.USER_AUTH_OK.message
                                                                                        });
                })
                .fail( function()
                {
                    dfd.reject.apply(this, arguments);
                });
            }

            return dfd.promise();
        },
        auth_valid: function()
        {
            return this.auth !== null && this.auth.key && new Date() - this.auth.update < 3600000;
        },
        clear_auth: function()
        {
            return this.auth = null;
        },
        _set_auth: function( key, value )
        {
            var valid_keys = ['name', 'avatar', 'key', 'update'];

            if( -1 === valid_keys.indexOf( key ) ) {
                return null;
            }

            this.auth = this.auth || {};
            return this.auth[key] = value;
        },
        _set_auth_update: function()
        {
            this._set_auth('update', new Date());
        },
        isOpen: function()
        {
            var dfd = $.Deferred()
                _self = this;

            $.ajax({
                url: _self.settings.endpoint_v2 + '/stream/' + _self.settings.threadId + '/status?token=' + _self.settings.token,
                type: 'GET',
                dataType: 'json'
            })
            .always( function( data, textStatus ) {
                if( textStatus === 'error' ) {
                    dfd.reject( _self.settings.response.STREAM_UNKNOWN_STATUS.code , _self.settings.response.STREAM_UNKNOWN_STATUS.type, new Error( _self.settings.response.STREAM_UNKNOWN_STATUS.message ) );
                }
                else {
                    // check if stream is open and save the respecitve return value in solution
                    solution = ( data.IsLive === true )?
                        {
                            'fn': 'resolve',
                            'arguments': [{}, _self.settings.response.STREAM_OK.type,   {   code: _self.settings.response.STREAM_OK.code,
                                                                                            type: _self.settings.response.STREAM_OK.type,
                                                                                            message: _self.settings.response.STREAM_OK.message
                                                                                        }]
                        }:
                        {
                            'fn': 'reject',
                            'arguments': [_self.settings.response.STREAM_CLOSED.code , _self.settings.response.STREAM_CLOSED.type, _self.settings.response.STREAM_CLOSED.message ]
                        };

                    // resolve/reject based on solution the deferred object
                    dfd[solution.fn].apply(dfd, solution.arguments);
                }
            });

            return dfd.promise();
        },
        postText: function( data )
        {
            var _self = this;

            if( typeof data.content !== 'string' || data.content === '') {
                return ( $.Deferred().reject(_self.settings.response.POST_NO_CONTENT.code , _self.settings.response.POST_NO_CONTENT.type, new Error( _self.settings.response.POST_NO_CONTENT.message ) ) ).promise();
            }

            var requestData = {
                'ThreadId': _self.settings.threadId,
                'Content': data.content
            }

            if( $.isPlainObject( data.location ) && ( data.location.lat && data.location.long ) ) {
                requestData['Location'] = {
                    'Lat': data.location.lat,
                    'Long': data.location.long
                }
            }

            if( $.isPlainObject( data.postmeta ) ) {
                requestData['PostMeta'] = data.postmeta;
            }

            var request = {
                url: _self.settings.endpoint_v2 + '/comments?token=' + _self.settings.token + '&auth=' + _self.auth.key,
                type: 'POST',
                dataType: 'json',
                contentType: "application/json",    // Set contentType Header
                data: JSON.stringify(requestData)
            }

            return $.ajax_progress( request ).done( _self._set_auth_update.bind(_self) );
        },
        postImage: function( data )
        {
            var _self = this;

            data['ThreadId'] = _self.settings.threadId;
            data['Caption'] = '';

            // The caption is optional don't add it to the form data if no content is provided
            if( typeof data.content === 'string' && data.content !== '') {
                data['Caption'] = data.content;
            }

            if( typeof data.file == 'object' && data.file instanceof File && !!data.file.type.match(/image/) ) {
                data['Image'] = data.file;
            }
            else {
                // Reject the upload of an image if no image data is provided
                return ( $.Deferred().reject(_self.settings.response.MEDIA_WRONG_TYPE.code , _self.settings.response.MEDIA_WRONG_TYPE.type, new Error( format( _self.settings.response.MEDIA_WRONG_TYPE.message , 'image/*' ) ) ) ).promise();
            }

            if( $.isPlainObject( data.location ) && ( data.location.lat && data.location.long ) ) {
                data['Location'] = JSON.stringify({
                    'Lat': data.location.lat,
                    'Long': data.location.long
                })
            }

            if( $.isPlainObject( data.postmeta ) ) {
                data['PostMeta'] = JSON.stringify(data.postmeta);
            }

            // check before send if the file exceeds the file upload limit
            if( data.file.size >= _self.limits.max_file_size_image * _self.limits.max_file_size_unit ) {
                return ( $.Deferred().reject( _self.settings.response.MEDIA_TOO_LARGE.code, _self.settings.response.MEDIA_TOO_LARGE.type, new Error( format( _self.settings.response.MEDIA_TOO_LARGE.message, data.file.name, _self.limits.max_file_size_image ) ) ) ).promise();
            }

            // Delete processed properties of data
            delete data.content;
            delete data.file;
            delete data.location;
            delete data.postmeta;

            var requestData = new FormData();
                for(property in data) { requestData.append(property, data[property]); }

            var request = {
                url: _self.settings.endpoint_v2 + '/comments/image?token=' + _self.settings.token + '&auth=' + _self.auth.key,
                type: 'POST',
                dataType: 'json',
                data: requestData,
                processData: false,
                contentType: false
            }

            return $.ajax_progress( request ).done( _self._set_auth_update.bind(_self) );
        },
        postVideo: function( data )
        {
            var _self = this;

            data['Token'] = _self.settings.token;
            data['Auth'] = _self.auth.key;

            // The caption is optional don't add it to the form data if no content is provided
            if( typeof data.content === 'string' && data.content !== '') {
                data['Content'] = data.content;
            }

            if( !(typeof data.file === 'object' && data.file instanceof File && !!data.file.type.match(/video/)) ) {
                // Reject the upload of an video if no video data is provided
                return ( $.Deferred().reject(_self.settings.response.MEDIA_WRONG_TYPE.code , _self.settings.response.MEDIA_WRONG_TYPE.type, new Error( format( _self.settings.response.MEDIA_WRONG_TYPE.message , 'video/*' ) ) ) ).promise();
            }

            if( data.file.size >= _self.limits.max_file_size_video * _self.limits.max_file_size_unit ) {
                return ( $.Deferred().reject( _self.settings.response.MEDIA_TOO_LARGE.code, _self.settings.response.MEDIA_TOO_LARGE.type, new Error( format( _self.settings.response.MEDIA_TOO_LARGE.message, data.file.name, _self.limits.max_file_size_video ) ) ) ).promise();
            }

            // Delete processed properties of data
            delete data.content;

            var requestData = new FormData();
                for(property in data) { requestData.append(property, data[property]); }

            var request = {
                url: this.settings.endpoint_v1 + '/event/' + _self.settings.threadId + '?format=json',
                type: 'POST',
                dataType: 'json',
                data: requestData,
                processData: false,
                contentType: false
            }

            return $.ajax_progress( request )
            .then(function( data, textStatus, jqXHR )
            {
                data.message = 'Comment successfully enqueued, processing Video';
                delete data.Message;
                return data;
            },
            function(jqXHR, textstatus, errorThrown)
            {
                var error = [];
                var uploadFailDFD = $.Deferred();
                if( jqXHR.status === 404 ) {
                    error = [_self.settings.response.MEDIA_TOO_LARGE.code, _self.settings.response.MEDIA_TOO_LARGE.type, new Error( format( _self.settings.response.MEDIA_TOO_LARGE.message, data.file.name, _self.limits.max_file_size_video ) )];
                }
                else if (jqXHR.status === 200 ) {
                    error = [_self.settings.response.MEDIA_NOT_SUPPORTED.code , _self.settings.response.MEDIA_NOT_SUPPORTED.type, new Error( format( _self.settings.response.MEDIA_NOT_SUPPORTED.message, data.file.name ) )];
                }
                else {
                    error = [_self.settings.response.UNKNOWN_ERROR.code , _self.settings.response.UNKNOWN_ERROR.type, new Error( _self.settings.response.UNKNOWN_ERROR.message )];
                }
                uploadFailDFD.rejectWith(this, error);
                return uploadFailDFD.promise();
            })
            .done( _self._set_auth_update.bind(_self) );
        },
        postAudio: function( data )
        {
            var _self = this;

            data['Token'] = _self.settings.token;
            data['Auth'] = _self.auth.key;

            // The caption is optional don't add it to the form data if no content is provided
            if( typeof data.content === 'string' && data.content !== '') {
                data['Content'] = data.content;
            }

            if( !(typeof data.file === 'object' && data.file instanceof File && !!data.file.type.match(/audio/)) ) {
                // Reject the upload of an video if no video data is provided
                return ( $.Deferred().reject(_self.settings.response.MEDIA_WRONG_TYPE.code , _self.settings.response.MEDIA_WRONG_TYPE.type, new Error( format( _self.settings.response.MEDIA_WRONG_TYPE.message , 'audio/*' ) ) ) ).promise();
            }

            if( data.file.size >= _self.limits.max_file_size_audio * _self.limits.max_file_size_unit ) {
                return ( $.Deferred().reject( _self.settings.response.MEDIA_TOO_LARGE.code, _self.settings.response.MEDIA_TOO_LARGE.type, new Error( format( _self.settings.response.MEDIA_TOO_LARGE.message, data.file.name, _self.limits.max_file_size_audio ) ) ) ).promise();
            }

            // Delete processed properties of data
            delete data.content;

            var requestData = new FormData();
                for(property in data) { requestData.append(property, data[property]); }

            var request = {
                url: this.settings.endpoint_v1 + '/event/' + _self.settings.threadId + '?format=json',
                type: 'POST',
                dataType: 'json',
                data: requestData,
                processData: false,
                contentType: false
            }

            return $.ajax_progress( request )
            .then(function( data )
            {
                data.message = 'Comment successfully enqueued, processing Audio';
                delete data.Message;
                return data;
            })
            .done( _self._set_auth_update.bind(_self) );
        },
        post: function( data )
        {
            var dfd = $.Deferred(),
                _self = this,
                done = function() {
                    dfd.resolve.apply( this, arguments );
                },
                fail = function() {
                    dfd.reject.apply( this, arguments );
                },
                image = typeof data.file === 'object' && data.file instanceof File && !!data.file.type.match(/image/),
                video = typeof data.file === 'object' && data.file instanceof File && !!data.file.type.match(/video/),
                audio = typeof data.file === 'object' && data.file instanceof File && !!data.file.type.match(/audio/),
                text = typeof data.content === 'string' && data.content !== '',
                fn = _self.postText;

            if( !_self.auth_valid() ) {
                dfd.reject(_self.settings.response.USER_AUTH_EXPIRED.code , _self.settings.response.USER_AUTH_EXPIRED.type, new Error( _self.settings.response.USER_AUTH_EXPIRED.message ) );
            }

            if( typeof data.content !== 'string' ) {
                dfd.reject(_self.settings.response.POST_INVALID_CONTENT.code , _self.settings.response.POST_INVALID_CONTENT.type, new Error( _self.settings.response.POST_INVALID_CONTENT.message ) );
            }

            if( !data.file && data.content === '' ) {
                dfd.reject(_self.settings.response.POST_NO_CONTENT.code , _self.settings.response.POST_NO_CONTENT.type, new Error( _self.settings.response.POST_NO_CONTENT.message ) );
            }

            dfd.state() !== 'rejected' && _self.isOpen().done( function() {

                // check if an alternative content upload method is needed
                (image && (fn = _self.postImage)) ||
                (video && (fn = _self.postVideo)) ||
                (audio && (fn = _self.postAudio))

                // execute the selected upload method
                fn.call( _self, data ).progress( dfd.notify.bind({type:'Content'}) ).done( done ).fail( fail );
            })
            .fail( fail );

            return dfd.promise();
        }
    }

    return commentEngine;
})(window, window.jQuery);