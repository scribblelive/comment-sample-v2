/*

Title: ScribbleLive Comment Script
Description: This script allows users to leave comments on any page that using the scribble api. An event must be dedicated to contain user comments.

*/

var commentEngine = (function(window, $, undefined) {

    function commentEngine( settings ) {
        var defaults = {
            'endpoint_v1': 'https://apiv1.scribblelive.com',
            'endpoint_v2': 'https://api.scribblelive.com/v1',
            'token': null,
            'threadId': null,
            '_v2_avatar_upload': true
        }

        this.settings = $.extend({}, defaults, settings );
        this.auth = null;
    }

    commentEngine.prototype = {
        _store_avatar: function( avatar_file ) {
            var dfd = $.Deferred(),
                xhrUploadProgress = function()
                {
                    var myXhr = $.ajaxSettings.xhr();
                    if(myXhr.upload) {
                        myXhr.upload.addEventListener('progress', function( e )
                        {
                            dfd.notify( {
                                            message: "Avatar Upload",
                                            progresstype: 1,
                                            value: Math.round(e.loaded * 100  / e.total)
                                        });
                        }, false);
                    }
                    return myXhr;
                },
                xhrNotifyUploadDone = function()
                {
                    dfd.notify({
                        message: "Avatar Upload finished",
                        progresstype: 1,
                        value: 100
                    });
                },
                xhrNotifyUploadFail = function()
                {
                    dfd.notify({
                        message: "Avatar Upload failed",
                        progresstype: 1,
                        value: "Error"
                    });
                },
                _self = this,
                has_avatar = typeof avatar_file != 'undefined',
                is_valid_avatar =  has_avatar && ( avatar_file instanceof File && !!avatar_file.type.match(/image/) );

            if( has_avatar && !is_valid_avatar ) {
                dfd.reject( { code: 8 } , "error", new Error( 'Avatar is not a image file' ));
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
                            var uploadDFD = $.Deferred();
                            $.ajax({
                                url: data.uploadUrl,
                                type: 'PUT',
                                data: avatar_file,
                                processData: false,
                                contentType: avatar_file.type,
                                xhr: xhrUploadProgress
                            })
                            .done( function() {
                                xhrNotifyUploadDone();
                                uploadDFD.resolve(data, "success", {});
                            })
                            .fail( function( jqXHR, textStatus, errorThrown ) {
                                xhrNotifyUploadFail();
                                uploadDFD.reject(jqXHR, textStatus, errorThrown);
                            })

                            return uploadDFD;
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
                    .then( _getAvatarUrl )
                    .done( function( data )
                    {
                        dfd.resolve({avatar_url: 'https://' + data.avatarUrl}, "success", {});
                    })
                    .fail( function(jqXHR, textstatus, errorThrown)
                    {
                        dfd.reject({ code: 8 }, "error", new Error( 'Avatar upload failed' ) );
                    });
                }
                else {
                    // ##### APIv1 avatar upload ######
                    var _uploadAvatar = function()
                        {
                            var avatarData = new FormData();
                                avatarData.append('file', avatar_file);

                            return $.ajax({
                                url: _self.settings.endpoint_v1 + "/user/avatar/upload",
                                type: 'POST',
                                data: avatarData,
                                processData: false,
                                contentType: false,
                                xhr: xhrUploadProgress
                            });
                        };

                    _uploadAvatar()
                    .done( function( data )
                    {
                        xhrNotifyUploadDone();
                        dfd.resolve({avatar_url: data}, "success", {});
                    })
                    .fail( function(jqXHR, textstatus, errorThrown)
                    {
                        xhrNotifyUploadFail();
                        dfd.reject({ code: 8 }, "error", new Error( 'Avatar upload failed' ) );
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
                dfd.resolve( this.auth, "success", {});
            }

            if( typeof user_name !== 'string' || user_name === '' ){
                dfd.reject( { code: 7 }, "error", new Error('Username "' + user_name + '" is not valid') );
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
                .progress( dfd.notify.bind(dfd) )
                .done( function( data )
                {
                    _self._set_auth('name', data.Name );
                    _self._set_auth('avatar', data.Avatar );
                    _self._set_auth('key', data.Auth );
                    _self._set_auth_update();

                    dfd.resolve( this.auth, 'success', {} );
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
            .always( function( data, textStatus) {
                if( textStatus === 'error' ) {
                    dfd.reject( { code: 4 }, "error", new Error('Couldn\'t verify open status of stream' ) );
                }
                else {
                    // check if stream is open and save the respecitve return value in solution
                    solution = ( data.IsLive === true )?
                        {
                            'fn': 'resolve',
                            'arguments': [{}, 'success', 'stream is open']
                        }:
                        {
                            'fn': 'reject',
                            'arguments': [{code: 5}, 'information', 'warning: Stream is closed']
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
                console.warn('No content provided to post to the stream');
                return ( $.Deferred().reject({ code: 6 }, 'error', new Error('no content [text] provided for posting' ) ) ).promise();
            }

            var requestData = {
                'ThreadId': _self.settings.threadId,
                'Content': data.content
            }

            // if( $.isPlainObject( data.location ) && ( data.location.lat && data.location.long ) ) {
            //     requestData['Location'] = {
            //         'Lat': data.location.lat,
            //         'Long': data.location.long,
            //         'SRID': 4326
            //     }
            // }

            // if( $.isPlainObject( data.postmeta ) ) {
            //     requestData['PostMeta'] = data.postmeta;
            // }

            var request = {
                url: _self.settings.endpoint_v2 + '/comments?token=' + _self.settings.token + '&auth=' + _self.auth.key,
                type: 'POST',
                dataType: 'json',
                contentType: "application/json",    // Set contentType Header
                data: JSON.stringify(requestData)
            }

            return $.ajax( request ).done( _self._set_auth_update.bind(_self) );
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
                console.warn('Media needs to be an instance of the File object and the type must contain image/*');
                return ( $.Deferred().reject({ code: 6 }, 'error', new Error('no media [image] provided for upload' ) ) ).promise();
            }

            // Delete processed properties of data
            delete data.content;
            delete data.file;
            delete data.location;

            var requestData = new FormData();
                for(property in data) { requestData.append(property, data[property]); }

            var imageUploadDfd = $.Deferred();

            var request = {
                url: _self.settings.endpoint_v2 + '/comments/image?token=' + _self.settings.token + '&auth=' + _self.auth.key,
                type: 'POST',
                dataType: 'json',
                data: requestData,
                processData: false,
                contentType: false,
                xhr: function()
                {
                    var myXhr = $.ajaxSettings.xhr();
                    if(myXhr.upload) {
                        myXhr.upload.addEventListener('progress', function( e )
                        {
                            imageUploadDfd.notify( {
                                            message: "Image Upload",
                                            progresstype: 1,
                                            value: Math.round(e.loaded * 100  / e.total)
                                        });
                        }, false);
                    }
                    return myXhr;
                }
            }

            $.ajax( request )
                .done( _self._set_auth_update.bind(_self) )
                .done( function(data, textStatus, jqXHR)
                {
                    imageUploadDfd.resolve( data, textStatus, jqXHR );
                })
                .fail( function(jqXHR, textStatus, errorThrown)
                {
                    imageUploadDfd.reject(jqXHR, textStatus, errorThrown);
                })

            return imageUploadDfd.promise();
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
                console.warn('Media needs to be an instance of the File object and the type must be a supported video type');
                return ( $.Deferred().reject({ code: 6 }, 'error', new Error('no media [video] provided for upload' ) ) ).promise();
            }

            // Delete processed properties of data
            delete data.content;

            var requestData = new FormData();
                for(property in data) { requestData.append(property, data[property]); }

            var videoUploadDfd = $.Deferred();

            var request = {
                url: this.settings.endpoint_v1 + '/event/' + _self.settings.threadId + '?format=json',
                type: 'POST',
                dataType: 'json',
                data: requestData,
                processData: false,
                contentType: false,
                xhr: function()
                {
                    var myXhr = $.ajaxSettings.xhr();
                    if(myXhr.upload) {
                        myXhr.upload.addEventListener('progress', function( e )
                        {
                            videoUploadDfd.notify( {
                                            message: "Video Upload",
                                            progresstype: 1,
                                            value: Math.round(e.loaded * 100  / e.total)
                                        });
                        }, false);
                    }
                    return myXhr;
                }
            }

            $.ajax( request ).then(function( data ) {
                data.message = 'Comment successfully enqueued, processing Video';
                delete data.Message;

                return data;
            })
            .done( _self._set_auth_update.bind(_self) )
            .done( function(data, textStatus, jqXHR)
            {
                videoUploadDfd.resolve( data, textStatus, jqXHR );
            })
            .fail( function(jqXHR, textStatus, errorThrown)
            {
                videoUploadDfd.reject(jqXHR, textStatus, errorThrown);
            });

            return videoUploadDfd.promise();
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
                text = typeof data.content === 'string' && data.content !== '';

            if( !_self.auth_valid() ) {
                dfd.reject({ code: 1 }, "error", new Error('Authentication is not valid or has expired') );
            }

            if( typeof data.content !== 'string' ) {
                dfd.reject({ code: 2 }, "error", new Error('Content "' + data.content + '" is not valid string') );
            }

            if( !data.file && data.content === '' ) {
                dfd.reject({ code: 3 }, "error", new Error('No content provided to send to the API' ) );
            }

            dfd.state() !== 'rejected' && _self.isOpen().done( function() {
                if( image ) {
                    _self.postImage( data ).progress( dfd.notify.bind(dfd) ).done( done ).fail( fail );
                }
                else if( video ) {
                    _self.postVideo( data ).progress( dfd.notify.bind(dfd) ).done( done ).fail( fail );
                }
                else if( text ) {
                    _self.postText( data ).done( done ).fail( fail );
                }
            })
            .fail( fail );

            return dfd.promise();
        }
    }

    return commentEngine;
})(window, window.jQuery);