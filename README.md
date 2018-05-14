ScribbleLive Comment Widget for APIv2
===========
This widget allows users to submit comments to an event from either a stand alone webpage or in a Scribble UI that doesn't support commenting (e.g Timeline, etc.)

The html, css, and javascript code can be placed in any page or the top or bottom html of a Scribblelive whitelabel. In order to operate this widget you will need a Scribblelive API token and the ID of an Event where the comments will be submitted to.

![Preview Image](http://customerfiles.scribblelive.com.s3.amazonaws.com/commentswidget/commentScreenv2.png)

## Widget Requirements
This widget requires jQuery to be defined on the page where it is being used and for a browser that supports HTML5. The image and avatar uploads require the HTML5 file upload functionality.

To include jQuery and the commenting engine file, please add the following to the head definition of your page or the top html of your event:

```HTML
<script src="http://ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js"></script>
<script type="text/javascript" src="comments.js"></script>
```

## Widget Styling
The css for the look and feel of the sample widget is included in the comments.css file. If you wish to change the look and feel of the widget please feel free to modify the styles.

```HTML
 <link rel="stylesheet" type="text/css" href="comments.css">
```

## Widget Initialization
To set up the widget on your page you will need to add a javascript call once jQuery finished loading to initialize the widget. The mandatory required parameters are your token and threadid. A description of each available mandatory and optional parameter can be found below.

```HTML
<script type="text/javascript">
    var comment = new commentEngine({
        token: 'YOURTOKEN',
        threadId: 'YOURTHREADID'
    });
</script>
```

### Mandatory Parameters
__token__
The api token for your Scribblelive Client.

__threadId__
The thread id of the event where you want your comments submitted.

### Optional Parameters
__endpoint_v1__
API v1 endpoint (http/https) default https

__endpoint_v2__
[API v2 endpoint](https://api.scribblelive.com/) (http/https) _default:_ https

__v2_avatar_upload__
Switch to utilize API v1 or API v2 avatar upload (true|false) _default:_ true

## Widget functions
A list of methods that become available after the widget was initialized  
__Note:__ All Promises are jQuery promises.

#### *Promise* comment.anon_login([force_auth, ] user_name [, user_avatar])

#### *Boolean* comment.auth_valid()

#### *NULL* comment.clear_auth()

#### *Promise* comment.isOpen()

#### *Promise* comment.post(data)

&nbsp;&nbsp;&nbsp;__data__: {content: 'string', [file: FileObject]}  
&nbsp;&nbsp;&nbsp;__data__: {[content: 'string'], file: FileObject}

&nbsp;&nbsp;&nbsp;If the *content* is passed in the File becomes optional (pure text post)  
&nbsp;&nbsp;&nbsp;If a *file* is passed the function will determine if it is a video or image (media post without caption)  
&nbsp;&nbsp;&nbsp;If *content* and *file* is passed the function will determine if it is a video or image and use the passed string as caption (media post with caption)

&nbsp;&nbsp;&nbsp;triggers upload progress notification via *.progress( fn )*  

#### *Promise* comment.postText(data)

&nbsp;&nbsp;&nbsp;__data__: {content: 'string'} 

&nbsp;&nbsp;&nbsp;triggers upload progress notification via *.progress( fn )*  

#### *Promise* comment.postImage(data)

&nbsp;&nbsp;&nbsp;__data__: {[content: 'string'], file: FileObject}

&nbsp;&nbsp;&nbsp;Accepted Filetypes:  
&nbsp;&nbsp;&nbsp;image/png  
&nbsp;&nbsp;&nbsp;image/gif  
&nbsp;&nbsp;&nbsp;image/jpeg  

&nbsp;&nbsp;&nbsp;triggers upload progress notification via *.progress( fn )*  

#### *Promise* comment.postVideo(data)

&nbsp;&nbsp;&nbsp;__data__: {[content: 'string'], file: FileObject}

&nbsp;&nbsp;&nbsp;Accepted Filetypes:  
&nbsp;&nbsp;&nbsp;video/mp4  
&nbsp;&nbsp;&nbsp;video/flv  
&nbsp;&nbsp;&nbsp;video/mov  
&nbsp;&nbsp;&nbsp;video/avi  

&nbsp;&nbsp;&nbsp;triggers upload progress notification via *.progress( fn )*  

#### *Promise* comment.postAudio(data)

&nbsp;&nbsp;&nbsp;__data__: {[content: 'string'], file: FileObject}

&nbsp;&nbsp;&nbsp;Accepted Filetypes:  
&nbsp;&nbsp;&nbsp;audio/mp3

&nbsp;&nbsp;&nbsp;__Note:__ submitted audio only shows in the queue of the standard interface

&nbsp;&nbsp;&nbsp;triggers upload progress notification via *.progress( fn )*  
