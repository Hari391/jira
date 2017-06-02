module.exports = function (app, addon) {
    
     // Root route. This route will serve the `atlassian-connect.json` unless the
     // documentation url inside `atlassian-connect.json` is set
     app.get('/', function (req, res) {
         res.format({
             // If the request content-type is text-html, it will decide which to serve up
             'text/html': function () {
                 res.redirect('/atlassian-connect.json');
             },
             // This logic is here to make sure that the `atlassian-connect.json` is always
             // served up when requested by the host
             'application/json': function () {
                 res.redirect('/atlassian-connect.json');
             }
         });
     });

     // The following is stub code for a Hello World app provided by ACE.
     // You can remove this section since it's not used in this tutorial, 
     // or leave it here – it makes no difference to this add-on.

     // This is an example route that's used by the default "generalPage" module.
     // Verify that the incoming request is authenticated with Atlassian Connect
     app.get('/hello-world', addon.authenticate(), function (req, res) {
             // Rendering a template is easy; the `render()` method takes two params: name of template
             // and a json object to pass the context in
             res.render('hello-world', {
                 title: 'Atlassian Connect'
             });
         }
     );

     // Add any additional route handlers you need for views or REST resources here...
     app.get('/activity', addon.authenticate(), function(req, res) {
         res.render('activity', { title: "addon abc" });
     });
 };
