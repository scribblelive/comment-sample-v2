ScribbleLive Comment Widget for APIv2
===========
This widget allows users to submit comments to an event from either a stand alone webpage or in a Scribble UI that doesn't support commenting (e.g Pinboard, Timeline, etc.)

The html, css, and javascript code can be placed in any page or the top or bottom html of a Scribblelive whitelabel. In order to operate this widget you will need a Scribblelive API token and the id of an Event where the comments will be submitted to.

![Preview Image](http://customerfiles.scribblelive.com.s3.amazonaws.com/commentswidget/commentScreenv2.png)

**__Creator: Gerd Paul__**

##Widget Requirements
This widget requires JQuery to be defined on the page where it is being used and for a browser that supports HTML5. The image and avatar uploads require the HTML5 file upload functinality.

To include JQuery and the commenting engine file please add the following to the head definition of your page or the top html of your event:

```HTML
<script src="http://ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js"></script>
<script type="text/javascript" src="comments.js"></script>
```

##Widget Styling
The css for the look and feel of the widget is included in the sample.html file. If you wish to change the look and feel of the widget please feel free to modify the styles. Please leave the assigned classes and ids as they are. Some of the Javascript relies on specific ids. You can freely add your own classes and include them in the class list for the element that you wish to modify. If you decide you need to change some of the ids or classes please make sure that they are passed properly to the comment engive via the javascript initialization below.

```HTML
 <link rel="stylesheet" type="text/css" href="comments.css">
```

##Widget Initialization
To set up the widget on your page you will need to at a javascript call once the page is finished loading to initialize the widget. The parameters you specify must match the ids or classes you assign to various input fields and preview divs so that the widget can function properly. If you are using the widget unmodified then you will just need to specify the api token and thread id. A description of each parameter can be found below.

```HTML
<script type="text/javascript">
    var comment = new commentEngine({
        token: 'YOURTOKEN',
        threadId: 'YOURTHREADID'
    });
</script>
```

###Mandatory Parameters
__token__
The api token for your Scribblelive Client.

__threadId__
The thread id of the event where you want your comments submitted.

###Optional Parameters
__endpoint_v1__
API v1 endpoint (http/https) default https

__endpoint_v2__
[API v2 endpoint](https://api.scribblelive.com/) (http/https) _default:_ https

__v2_avatar_upload__
Switch to utilize API v1 or API v2 avatar upload (true|false) _default:_ true

##Widget functions

####comment.anon_login([force_auth, ] user_name [, user_avatar])

####comment.auth_valid()

####comment.clear_auth()

####comment.isOpen()

####comment.post(data)

&nbsp;&nbsp;&nbsp;__data__: {content: 'string', [file: FileObject]}
&nbsp;&nbsp;&nbsp;__data__: {[content: 'string'], file: FileObject}

&nbsp;&nbsp;&nbsp;If the *content* is passed in the File becomes optional (pure text post)
&nbsp;&nbsp;&nbsp;If a *file* is passed the function will determine if it is a video or image (media post without caption)
&nbsp;&nbsp;&nbsp;If *content* and *file* the function will determine if it is a video or image and use the passed string as caption (media post with caption)

####comment.postText(data)

&nbsp;&nbsp;&nbsp;__data__: {content: 'string'}

####comment.postImage(data)

&nbsp;&nbsp;&nbsp;__data__: {[content: 'string'], file: FileObject}

&nbsp;&nbsp;&nbsp;Accepted Filetypes:
&nbsp;&nbsp;&nbsp;image/png
&nbsp;&nbsp;&nbsp;image/gif
&nbsp;&nbsp;&nbsp;image/jpeg

####comment.postVideo(data)

&nbsp;&nbsp;&nbsp;__data__: {[content: 'string'], file: FileObject}

&nbsp;&nbsp;&nbsp;Accepted Filetypes:
&nbsp;&nbsp;&nbsp;video/mp4
&nbsp;&nbsp;&nbsp;video/flv
&nbsp;&nbsp;&nbsp;video/mov
&nbsp;&nbsp;&nbsp;video/avi

####comment.postAudio(data)

&nbsp;&nbsp;&nbsp;__data__: {[content: 'string'], file: FileObject}

&nbsp;&nbsp;&nbsp;Accepted Filetypes:
&nbsp;&nbsp;&nbsp;audio/mp3

&nbsp;&nbsp;&nbsp;Note: submitted audio only shows in the queue of the Standard interface