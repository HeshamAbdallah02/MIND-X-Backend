import mongoose from 'mongoose';

const headerSchema = new mongoose.Schema({
  logo: {
    imageUrl: String,
    publicId: String,
    altText: { type: String, default: 'MIND-X Logo' }
  },
  colors: {
    background: {
      type: String,
      default: '#81C99C'
    },
    text: {
      default: {
        type: String,
        default: '#606161'
      },
      hover: {
        type: String,
        default: '#FBB859'
      }
    }
  }
}, { timestamps: true });

export default mongoose.model('Header', headerSchema);