import { Request, Response } from "express";
import blogModel from "../models/blogModel";
import { Blog } from "../types";
import validateMongoID from "../middlewares/validateMongoId";

export const createBlog = async (req: Request, res: Response) => {
  const { title, description, category } = req.body;

  try {
    const result = await blogModel.create({
      title: title,
      description: description,
      category: category,
    });

    console.log(result);

    res.send({
      blogPosted: true,
      message: "success",
      result: result,
    });
  } catch (err) {
    res.send({
      blogPosted: true,
      message: "failed to post",
      error: err,
    });
  }
};

export const deleteBlog = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await blogModel.findByIdAndUpdate(
      { _id: id },
      { status: "Inactive" }
    );

    res.send({
      blogDeleted: true,
      message: "Blog deleted",
    });
  } catch (err) {
    res.send({
      blogDeleted: false,
      message: "failed to delete",
      error: err,
    });
  }
};

export const updateBlog = async (req: Request, res: Response) => {
  const { id } = req.params;

  const { title, description, category } = req.body;

  try {
    const result = await blogModel.findByIdAndUpdate(
      { _id: id },
      {
        title: title,
        description: description,
        category: category,
      },
      { new: true }
    );

    res.send({
      blogUpdated: true,
      message: "Blog updated",
      result: result,
    });
  } catch (error) {
    res.send({
      blogUpdated: false,
      message: "Failed to update blog",
      error: error,
    });
  }
};

export const getOneBlog = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await blogModel.updateOne(
      { _id: id },
      { $inc: { numViews: 1 } }
    );
    const blog = await blogModel.findById({ _id: id })

  return  res.send({
      blog,
    });
  } catch (error) {
    console.log(error);
    
  }
};

export const getAllBlogs = async (req: Request, res: Response) => {
  try {
    const allBlogs = await blogModel.find();

    res.send({
      blogs: allBlogs,
    });
  } catch (error) {
    res.send({
      blogsRetrieved: false,
      message: "failed to retrieve blogs",
      error: error,
    });
  }
};

export const likeBlog = async (req: Request, res: Response) => {
  const { blogId } = req.params;

  console.log("blogid  " + blogId);

  try {
    const userLoggedInId = req?.user;

    console.log(userLoggedInId);

    //Find the blog that user wants to like
    const blog = await blogModel.findById({ _id: blogId });

    //Find out id blog is already liked
    const isLiked = blog.isLiked;

    console.log(isLiked);

    const isAlreadyDisLiked = await blogModel.count({
      _id: blogId,
      dislikes: { $in: [userLoggedInId?.toString()] },
    });

    console.log(isAlreadyDisLiked);  

    if (isAlreadyDisLiked === 1) {
      //if user previously had not disliked, push user to likes array immediately
      const blog = await blogModel.findByIdAndUpdate(
        { _id: blogId },
        {
          $pull: { dislikes: userLoggedInId },
          isDisliked: false,
        },
        { new: true }
      );

     return  res.send(blog);
    }

    if (!isLiked) {
      const blog = await blogModel.findByIdAndUpdate(
        blogId,
        {
          $push: { likes: userLoggedInId },
          isLiked: true,
        },
        { new: true }
      );
    return  res.json(blog);
    }

    if (isLiked) {
      const blog = await blogModel.findByIdAndUpdate( 
        blogId,
        {
          $pull: { likes: userLoggedInId },
          isLiked: false,
        },
        { new: true }
      );
   return   res.json(blog);
    }
  } catch (error) {
    res.send({ error: error });
  }
};



export const dislikeBlog = async (req: Request, res: Response) => {
    const { blogId } = req.params;
  
    console.log("blogid  " + blogId);
  
    try {
      const userLoggedInId = req?.user;
  
      console.log(userLoggedInId);
  
      //Find the blog that user wants to dislike
      const blog = await blogModel.findById({ _id: blogId });
  
      //Find out id blog is already liked
      const isDisliked = blog.isDisliked;
  
      console.log(isDisliked);
  
      const isAlreadyLiked = await blogModel.count({
        _id: blogId,
        likes: { $in: [userLoggedInId?.toString()] },
      });
  
      console.log( "HAS ALREADY LIKED? "+ isAlreadyLiked );
  
      if ( isAlreadyLiked === 1) {
        //if user previously had not disliked, push user to likes array immediately
        const blog = await blogModel.findByIdAndUpdate(
          { _id: blogId },
          {
            $pull: { likes: userLoggedInId },
            isLiked: false,
          },
          { new: true }
        );
  
       return res.send(blog);
      }
  
      if (!isDisliked) {  
     
      }
  
      if ( isDisliked) {
        const blog = await blogModel.findByIdAndUpdate(
          blogId,
          {
            $pull: { dislikes: userLoggedInId },
            isDisliked: false,
          },
          { new: true }
        );
        res.json(blog);
      }else{
        const blog = await blogModel.findByIdAndUpdate(
            blogId,
            {
              $push: { dislikes: userLoggedInId },
              isDisliked: true,
            },
            { new: true } 
          );
          res.json(blog); 


      }


    } catch (error) {
      //res.send({ error: error });
    }
  };


  export const uploadPhoto = (req:any,res:Response)=>{

    if (!req.file) {

        console.log("No upload");
       
    
        res.send("No upload");
      }

      res.send({fileName: req.file.filename })



  }


  