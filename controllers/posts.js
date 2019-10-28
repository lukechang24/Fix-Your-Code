const express = require("express");
const router = express.Router();

const Post = require("../models/posts")
const User = require("../models/users")
const Comment = require("../models/comments")
// const nl2br = require("locutus/php/strings/nl2br");

router.get("/", async (req, res) => {
    try {
        const posts = await Post.find({});
        res.render("posts/index", {
            posts
        });
    } catch(err) {
        console.log(err);
    }
})

router.get("/new", (req, res) => {
    if(req.session.username) {
        res.render("posts/new");
    } else {
        req.session.previousURL = `/posts/new`;
        res.render("auth/login", {
            message: "You must be logged in to create a post"
        });
    }
})

router.post("/", async (req, res) => {
    try {
        req.body.creator = req.session.userID;
        const post = await Post.create(req.body);
        console.log(post);
        const user = await User.findOne({username: req.session.username});
        user.posts.push(post);
        user.save();
        res.redirect("/posts");
    }catch (err) {
        console.log(err);   
    }
})

router.post("/:id/comment", async (req, res) => {
    try {
        if(!req.body.comment) {
            res.redirect(`/posts/${req.params.id}`);
        } else if(req.session.username) {
            // let dateFromObjectId = function(id) {
            //     return new Date(parseInt(id.substring(0, 8), 16) * 1000);
            // };
            const comment = await Comment.create({postId: req.params.id, userID: req.session.userID, commentedBy: req.session.displayName, comment: req.body.comment})
            const user = await User.findOne({username: req.session.username});
            user.comments.push(comment);
            user.save();
            console.log(comment)
            // console.log(dateFromObjectId(comment._id.toString()));
            res.redirect(`/posts/${req.params.id}`);
        } else {
            req.session.previousURL = `/posts/${req.params.id}`;
            res.render("auth/login", {
                message: "You must be logged in to comment"
            });
        }
    } catch(err) {
        console.log(err);
    }
})

router.get("/:id", async (req, res) => {
    try {
        const post = await Post.findOne({_id: req.params.id})
        .populate({path: "creator"});
        console.log(post);
        const currentUser = await User.findOne({username: req.session.username}) || {_id: "", username: ""};
        const comments = await Comment.find({postId: req.params.id}) || [];
        console.log(currentUser, "current user")
        res.render("posts/show", {
            post,
            currentUser,
            comments
        })
    } catch(err) {
        console.log(err)
    }
})

router.delete("/:id/:commentID", async (req, res) => {
    try {
        const comment = await Comment.findByIdAndDelete(req.params.commentID);
        const user = await User.findOneAndUpdate({_id: comment.userID}, {$pull: {comments: req.params.commentID}});
        console.log(user);
        user.save();
        res.redirect(`/posts/${req.params.id}`);
    } catch(err) {
        console.log(err);
    }
})

router.delete("/:id", async (req, res) => {
    try {
        const post = await Post.findOneAndDelete({_id: req.params.id});
        console.log(post)
        res.redirect("/posts");
    } catch(err) {
        console.log(err);
    }
})

module.exports = router;