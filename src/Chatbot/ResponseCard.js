import React from 'react';
import {
  Card, CardImg, CardBody,
  CardTitle, CardSubtitle, Button
} from 'reactstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import style from './ResponseCard.module.css';

const ResponseCard = (props) => {
    const buttonHandler = async (event) => {
        props.handler(event.target.value);
    }
    
    const buttons = props.buttons.map((m,i) => {
        return (
                <div key={i}>
                    <Button onClick={buttonHandler} style={{minWidth:"200px"}} value={m.value}>
                        {m.text}
                    </Button><p />
                </div>
                );
    });

    return (
        <div className={style.Card}>
            <Card>
                <CardImg top width="100%" src={props.imageUrl} />
                <CardBody className="text-center">
                    <CardTitle>{props.title}</CardTitle>
                    <CardSubtitle className={style.subtitle}>{props.subtitle}</CardSubtitle>
                    {buttons}
                </CardBody>
            </Card>
        </div>
    );
};

export default ResponseCard;